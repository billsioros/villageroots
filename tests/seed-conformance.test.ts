import { describe, expect, it } from 'vitest'
import { EDGES, NODES } from '@/lib/graph/data'
import { VERB_DIRECTION } from '@/lib/graph/helpers'

function nodeType(id: string) {
  return NODES.find((n) => n.id === id)?.type
}

function birthOf(id: string): number | null {
  const n = NODES.find((x) => x.id === id)
  const m = (n?.subtitle ?? '').match(/(?:1|2)\d{3}/)
  return m ? Number(m[0]) : null
}

describe('seed edge direction conforms to VERB_DIRECTION', () => {
  it('covers every seed edge verb', () => {
    for (const e of EDGES) {
      expect(VERB_DIRECTION[e.verb], `edge ${e.id}`).toBeDefined()
    }
  })

  it('child_of/parent_of edges link two persons', () => {
    for (const e of EDGES) {
      if (e.verb === 'child_of' || e.verb === 'parent_of') {
        expect(nodeType(e.source), `edge ${e.id}`).toBe('person')
        expect(nodeType(e.target), `edge ${e.id}`).toBe('person')
      }
    }
  })

  it('child_of points from the child to an older parent', () => {
    for (const e of EDGES.filter((x) => x.verb === 'child_of')) {
      const child = birthOf(e.source)
      const parent = birthOf(e.target)
      if (child === null || parent === null) continue
      expect(parent, `edge ${e.id}: parent must be born no later than child`).toBeLessThanOrEqual(child)
    }
  })

  it('parent_of points from an older parent to the child', () => {
    for (const e of EDGES.filter((x) => x.verb === 'parent_of')) {
      const parent = birthOf(e.source)
      const child = birthOf(e.target)
      if (parent === null || child === null) continue
      expect(parent, `edge ${e.id}`).toBeLessThanOrEqual(child)
    }
  })

  it('belongs_to_clan connects a person to a family', () => {
    for (const e of EDGES.filter((x) => x.verb === 'belongs_to_clan')) {
      const [personSide, familySide] =
        nodeType(e.source) === 'person' ? [e.source, e.target] : [e.target, e.source]
      expect(nodeType(personSide), `edge ${e.id}`).toBe('person')
      expect(nodeType(familySide), `edge ${e.id}`).toBe('family')
    }
  })

  it('ran_by/built_by point from institution to actor (source non-person, target person)', () => {
    for (const e of EDGES.filter((x) => x.verb === 'ran_by' || x.verb === 'built_by')) {
      expect(nodeType(e.source), `edge ${e.id}`).not.toBe('person')
      expect(nodeType(e.target), `edge ${e.id}`).toBe('person')
    }
  })

  it('geo verbs point a person/family to a place', () => {
    const geo = ['born_in', 'owns_land_at', 'lived_at', 'farmed_at']
    for (const e of EDGES.filter((x) => geo.includes(x.verb))) {
      expect(['person', 'family'], `edge ${e.id}`).toContain(nodeType(e.source))
      expect(['toponym', 'landmark'], `edge ${e.id}`).toContain(nodeType(e.target))
    }
  })
})
