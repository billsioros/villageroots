import { describe, expect, it } from 'vitest'
import { VERB_KIND, VERBS } from '@/lib/graph/helpers'

describe('parent_of verb wiring', () => {
  it('is part of the VERB list', () => {
    expect(VERBS).toContain('parent_of')
  })

  it('maps to the social edge kind', () => {
    expect(VERB_KIND.parent_of).toBe('social')
  })
})
