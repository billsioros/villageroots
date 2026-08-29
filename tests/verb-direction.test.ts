import { describe, expect, it } from 'vitest'
import { VERB_DIRECTION, VERB_KIND, type VerbDirection } from '@/lib/graph/helpers'
import type { Verb } from '@/lib/graph/types'

describe('VERB_DIRECTION', () => {
  it('covers exactly the verbs in VERB_KIND', () => {
    expect(Object.keys(VERB_DIRECTION).sort()).toEqual(Object.keys(VERB_KIND).sort())
  })

  it('flags the symmetric verbs', () => {
    for (const v of ['related_to', 'married_to', 'sibling_of'] as Verb[]) {
      expect(VERB_DIRECTION[v].symmetric).toBe(true)
    }
  })

  it('documents a reading for every directional verb', () => {
    for (const v of Object.keys(VERB_DIRECTION) as (keyof typeof VERB_DIRECTION)[]) {
      const dir = VERB_DIRECTION[v]
      if (!dir.symmetric) expect(dir.reading.length).toBeGreaterThan(0)
    }
  })

  it('reads ran_by/built_by passively from institution to actor', () => {
    const ranBy = VERB_DIRECTION.ran_by as Extract<VerbDirection, { symmetric: false }>
    const builtBy = VERB_DIRECTION.built_by as Extract<VerbDirection, { symmetric: false }>
    expect(ranBy.reading).toContain('run by')
    expect(builtBy.reading).toContain('built by')
  })
})
