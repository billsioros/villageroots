import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode } from '@/lib/graph/types'
import {
  buildAncestralTree,
  filterTreeData,
  FAMILY_INSET,
  parentChildPath,
  pickFocalPerson,
  resolveFamilyLinks,
  TIER_HEIGHT,
  TREE_EDGE_VERBS,
  X_SPACING,
} from '@/lib/graph/tree'

function node(id: string, over: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    type: 'person',
    label: id,
    subtitle: '',
    description: '',
    color: '',
    mark: '',
    x: 0,
    y: 0,
    ...over,
  }
}

function edge(id: string, source: string, target: string, verb: GraphEdge['verb']): GraphEdge {
  return { id, source, target, verb, kind: 'social' }
}

describe('resolveFamilyLinks', () => {
  it('child_of points child → parent', () => {
    const nodes = [node('kid'), node('parent')]
    const links = resolveFamilyLinks(nodes, [edge('e', 'kid', 'parent', 'child_of')])
    expect(links.parentsById.get('kid')).toEqual(['parent'])
  })

  it('parent_of points parent → child (inverse encoding)', () => {
    const nodes = [node('kid'), node('parent')]
    const links = resolveFamilyLinks(nodes, [edge('e', 'parent', 'kid', 'parent_of')])
    expect(links.parentsById.get('kid')).toEqual(['parent'])
  })

  it('dedupes a parent declared by both encodings', () => {
    const nodes = [node('kid'), node('parent')]
    const links = resolveFamilyLinks(nodes, [
      edge('e1', 'kid', 'parent', 'child_of'),
      edge('e2', 'parent', 'kid', 'parent_of'),
    ])
    expect(links.parentsById.get('kid')).toEqual(['parent'])
  })

  it('married_to is symmetric', () => {
    const nodes = [node('a'), node('b')]
    const links = resolveFamilyLinks(nodes, [edge('e', 'a', 'b', 'married_to')])
    expect(links.spousesById.get('a')).toEqual(['b'])
    expect(links.spousesById.get('b')).toEqual(['a'])
  })

  it('belongs_to_clan maps a person to their family', () => {
    const nodes = [node('p'), node('f', { type: 'family' })]
    const links = resolveFamilyLinks(nodes, [edge('e', 'p', 'f', 'belongs_to_clan')])
    expect(links.familiesById.get('p')).toEqual(['f'])
  })

  it('ignores edges whose endpoints are not in the node set', () => {
    const nodes = [node('kid')]
    const links = resolveFamilyLinks(nodes, [edge('e', 'kid', 'ghost', 'child_of')])
    expect(links.parentsById.get('kid')).toBeUndefined()
  })
})

describe('buildAncestralTree', () => {
  function tree(focal: string, nodes: GraphNode[], edges: GraphEdge[]) {
    return buildAncestralTree(nodes, edges, { focalPersonId: focal })
  }

  it('places the focal at tier 0 using its own y', () => {
    const a = node('a', { y: 200 })
    const r = tree('a', [a], [])
    expect(r.slots.get('a')?.tier).toBe(0)
    expect(r.slots.get('a')?.y).toBe(200)
    expect(r.depth).toBe(0)
  })

  it('assigns one ancestor tier per parent row', () => {
    const a = node('a', { y: 200 })
    const p = node('p')
    const g = node('g')
    const r = tree('a', [a, p, g], [
      edge('e1', 'a', 'p', 'child_of'),
      edge('e2', 'p', 'g', 'child_of'),
    ])
    expect(r.slots.get('p')?.tier).toBe(1)
    expect(r.slots.get('p')?.y).toBe(200 - TIER_HEIGHT)
    expect(r.slots.get('g')?.tier).toBe(2)
    expect(r.slots.get('g')?.y).toBe(200 - 2 * TIER_HEIGHT)
  })

  it('keeps a parent declared by both encodings once (pedigree dedupe)', () => {
    const a = node('a')
    const p = node('p')
    const r = tree('a', [a, p], [
      edge('e1', 'a', 'p', 'child_of'),
      edge('e2', 'p', 'a', 'parent_of'),
    ])
    expect(r.slots.size).toBe(2)
    expect(r.slots.get('p')?.tier).toBe(1)
  })

  it('collapses a shared grandparent reached from both parents (pedigree collapse)', () => {
    const a = node('a')
    const m1 = node('m1')
    const m2 = node('m2')
    const g = node('g')
    const r = tree('a', [a, m1, m2, g], [
      edge('e1', 'a', 'm1', 'child_of'),
      edge('e2', 'a', 'm2', 'child_of'),
      edge('e3', 'm1', 'g', 'child_of'),
      edge('e4', 'm2', 'g', 'child_of'),
    ])
    expect(r.slots.get('g')?.tier).toBe(2)
    expect([...r.slots.values()].filter((s) => s.tier === 2).length).toBe(1) // visited dedupe
    expect(r.slots.size).toBe(4)
  })

  it('breaks cycles via the visited set', () => {
    const a = node('a')
    const b = node('b')
    const r = tree('a', [a, b], [
      edge('e1', 'a', 'b', 'child_of'),
      edge('e2', 'b', 'a', 'child_of'),
    ])
    expect(r.slots.size).toBe(2)
  })

  it('honours maxDepth', () => {
    const a = node('a')
    const p = node('p')
    const g = node('g')
    const r = buildAncestralTree([a, p, g], [
      edge('e1', 'a', 'p', 'child_of'),
      edge('e2', 'p', 'g', 'child_of'),
    ], { focalPersonId: 'a', maxDepth: 1 })
    expect(r.slots.get('g')).toBeUndefined()
    expect(r.slots.get('p')?.tier).toBe(1)
  })

  it('truncates at maxSlots', () => {
    const a = node('a')
    const p1 = node('p1')
    const p2 = node('p2')
    const r = buildAncestralTree([a, p1, p2], [
      edge('e1', 'a', 'p1', 'child_of'),
      edge('e2', 'a', 'p2', 'child_of'),
    ], { focalPersonId: 'a', maxSlots: 2 })
    expect(r.truncated).toBe(true)
    expect(r.slots.size).toBe(2)
  })

  it('renders a spouse at the same tier without walking their parents', () => {
    const a = node('a', { y: 200 })
    const p = node('p')
    const sp = node('sp')
    const g = node('g') // sp's own parent — must NOT appear
    const r = tree('a', [a, p, sp, g], [
      edge('e1', 'a', 'p', 'child_of'),
      edge('e2', 'p', 'sp', 'married_to'),
      edge('e3', 'sp', 'g', 'child_of'),
    ])
    expect(r.slots.get('sp')?.tier).toBe(1)
    expect(r.slots.get('sp')?.y).toBe(200 - TIER_HEIGHT)
    expect(r.slots.get('g')).toBeUndefined()
  })

  it('pairs a leaf with its spouse at the same gap', () => {
    const a = node('a')
    const p = node('p') // label asc: "p" before "sp"
    const sp = node('sp')
    const r = tree('a', [a, p, sp], [
      edge('e1', 'a', 'p', 'child_of'),
      edge('e2', 'p', 'sp', 'married_to'),
    ])
    const px = r.slots.get('p')?.x ?? 0
    const sx = r.slots.get('sp')?.x ?? 0
    expect(px).toBeLessThan(sx)
    expect(sx - px).toBe(X_SPACING)
  })

  it('places a single-parent couple without a ghost partner', () => {
    const a = node('a')
    const p = node('p')
    const r = tree('a', [a, p], [edge('e1', 'a', 'p', 'child_of')])
    expect(r.couples).toEqual([
      { members: ['p'], familyIds: [], tier: 1 },
    ])
  })

  it('keeps a chain ancestor aligned with its single parent', () => {
    const r = tree('f', [node('f'), node('g1'), node('g2'), node('g3')], [
      edge('e1', 'f', 'g1', 'child_of'),
      edge('e2', 'g1', 'g2', 'child_of'),
      edge('e3', 'g2', 'g3', 'child_of'),
    ])
    const xs = ['g1', 'g2', 'g3'].map((id) => r.slots.get(id)!.x)
    expect(new Set(xs).size).toBe(1)
  })

  it('separates same-tier ancestors whose anchors coincide', () => {
    const a = node('a')
    const m1 = node('m1')
    const m2 = node('m2')
    const g = node('g')
    const r = tree('a', [a, m1, m2, g], [
      edge('e1', 'a', 'm1', 'child_of'),
      edge('e2', 'a', 'm2', 'child_of'),
      edge('e3', 'm1', 'g', 'child_of'),
      edge('e4', 'm2', 'g', 'child_of'),
    ])
    const x1 = r.slots.get('m1')!.x // keeps g.x (anchor)
    const x2 = r.slots.get('m2')!.x // same anchor → collision pushes +X_SPACING
    expect(Math.abs(x1 - x2)).toBe(X_SPACING)
  })

  it('places a family banner above its couple', () => {
    const a = node('a')
    const p = node('p')
    const sp = node('sp')
    const f = node('f', { type: 'family' })
    const r = tree('a', [a, p, sp, f], [
      edge('e1', 'a', 'p', 'child_of'),
      edge('e2', 'p', 'sp', 'married_to'),
      edge('e3', 'p', 'f', 'belongs_to_clan'),
      edge('e4', 'sp', 'f', 'belongs_to_clan'),
    ])
    const fs = r.slots.get('f')
    expect(fs).toBeDefined()
    expect(fs?.y).toBe(Math.min(r.slots.get('p')!.y, r.slots.get('sp')!.y) - FAMILY_INSET)
    expect(r.couples.find((c) => c.members.includes('p'))?.familyIds).toContain('f')
  })

  it('excludes non-person, non-family nodes entirely', () => {
    const a = node('a')
    const l = node('l', { type: 'landmark' })
    const r = tree('a', [a, l], [edge('e1', 'a', 'l', 'born_in')])
    expect(r.slots.size).toBe(1)
    expect(r.slots.get('l')).toBeUndefined()
  })

  it('returns an empty result for a missing or non-person focal', () => {
    const f = node('f', { type: 'family' })
    expect(tree('ghost', [f], []).slots.size).toBe(0)
    expect(tree('ghost', [], []).slots.size).toBe(0)
  })
})

describe('filterTreeData', () => {
  it('keeps only tree verbs with both endpoints inside the slots', () => {
    const a = node('a')
    const p = node('p')
    const mill = node('l-mill', { type: 'landmark' })
    const slots = new Map([
      ['a', { id: 'a', x: 0, y: 0, tier: 0 }],
      ['p', { id: 'p', x: 0, y: -150, tier: 1 }],
    ])
    const out = filterTreeData([a, p, mill], [
      edge('e1', 'a', 'p', 'child_of'),
      edge('e2', 'a', 'l-mill', 'ran_by'),
      edge('e3', 'mill', 'p', 'married_to'),
    ], slots)
    expect(out.nodes.map((n) => n.id)).toEqual(['a', 'p'])
    expect(out.links.map((l) => l.id)).toEqual(['e1'])
  })

  it('keeps family links in the tree verb set and excludes the redundant parent_of', () => {
    expect(TREE_EDGE_VERBS).toContain('child_of')
    expect(TREE_EDGE_VERBS).toContain('married_to')
    expect(TREE_EDGE_VERBS).toContain('belongs_to_clan')
    expect(TREE_EDGE_VERBS).toContain('sibling_of')
    expect(TREE_EDGE_VERBS).not.toContain('parent_of')
  })
})

describe('parentChildPath', () => {
  it('produces a vertical-elbow path from parent to child', () => {
    const path = parentChildPath(
      { x: 0, y: 0, w: 80, h: 40 },
      { x: 100, y: 150, w: 80, h: 40 },
    )
    expect(path.px).toBe(0)
    expect(path.py).toBe(20) // parent bottom
    expect(path.mx).toBe(100)
    expect(path.my).toBe((20 + 130) / 2) // midpoint between parent bottom and child top
    expect(path.cx).toBe(100)
    expect(path.cy).toBe(130) // child top
  })
})

describe('pickFocalPerson', () => {
  it('picks the earliest-born person', () => {
    const young = node('young', { label: 'Young', subtitle: 'b. 1935' })
    const old = node('old', { label: 'Old', subtitle: '1898–1978 · miller' })
    expect(pickFocalPerson([young, old])?.id).toBe('old')
  })

  it('breaks birth-year ties by label alphabetical order', () => {
    const b = node('b', { label: 'Beta', subtitle: 'b. 1900' })
    const a = node('a', { label: 'Alpha', subtitle: 'b. 1900' })
    expect(pickFocalPerson([b, a])?.id).toBe('a')
  })

  it('skips non-person nodes', () => {
    const l = node('l', { type: 'landmark', label: 'Mill', subtitle: 'built 1901' })
    expect(pickFocalPerson([l])).toBeNull()
  })

  it('returns null when there are no persons', () => {
    expect(pickFocalPerson([])).toBeNull()
  })
})
