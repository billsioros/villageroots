import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode } from '@/lib/graph/types'
import {
  buildFamilyForest,
  clanMembers,
  filterTreeData,
  FAMILY_INSET,
  parentChildPath,
  personClans,
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

describe("clan mapping helpers", () => {
  it("maps a person to their clans sorted by label (personClans)", () => {
    const p = node("p")
    const f1 = node("f1", { type: "family", label: "Zulu" })
    const f2 = node("f2", { type: "family", label: "Alpha" })
    const pc = personClans([p, f1, f2], [
      edge("e1", "p", "f1", "belongs_to_clan"),
      edge("e2", "p", "f2", "belongs_to_clan"),
    ])
    expect(pc.get("p")).toEqual(["f2", "f1"])
  })

  it("maps a clan to its member persons sorted by label (clanMembers)", () => {
    const p = node("zeta")
    const q = node("alpha")
    const f = node("f", { type: "family" })
    const cm = clanMembers([p, q, f], [
      edge("e1", "zeta", "f", "belongs_to_clan"),
      edge("e2", "alpha", "f", "belongs_to_clan"),
    ])
    expect(cm.get("f")).toEqual(["alpha", "zeta"])
  })

  it("skips persons with no clan and clans with no members", () => {
    const p = node("p")
    const f = node("f", { type: "family" })
    const pc = personClans([p, f], [])
    expect(pc.size).toBe(0)
    expect(clanMembers([p, f], []).get("f")).toBeUndefined()
  })
})

describe('buildFamilyForest', () => {
  function tree(nodes: GraphNode[], edges: GraphEdge[]) {
    return buildFamilyForest(nodes, edges)
  }

  it('places roots on tier 0 and children one tier below', () => {
    const root = node('root')
    const kid = node('kid')
    const r = tree([root, kid], [edge('e1', 'kid', 'root', 'child_of')])
    expect(r.slots.get('root')?.tier).toBe(0)
    expect(r.slots.get('kid')?.tier).toBe(1)
    expect((r.slots.get('kid')!.y) - (r.slots.get('root')!.y)).toBe(TIER_HEIGHT)
  })

  it('uses longest-path layering when parents sit on different tiers', () => {
    const g1 = node('g1')
    const g2 = node('g2')
    const m2 = node('m2')
    const m1 = node('m1')
    const c = node('c')
    const r = tree([g1, g2, m2, m1, c], [
      edge('e1', 'g2', 'g1', 'child_of'),
      edge('e2', 'm2', 'g2', 'child_of'),
      edge('e3', 'c', 'm1', 'child_of'),
      edge('e4', 'c', 'm2', 'child_of'),
    ])
    expect(r.slots.get('c')?.tier).toBe(3) // max(0 + 1, 2 + 1)
  })

  it('merges married spouses onto one shared tier', () => {
    const nik = node('nik')
    const eleni = node('eleni')
    const alex = node('alex')
    const r = tree([nik, eleni, alex], [
      edge('e1', 'eleni', 'nik', 'child_of'),
      edge('e2', 'eleni', 'alex', 'married_to'),
    ])
    expect(r.slots.get('eleni')?.tier).toBe(r.slots.get('alex')?.tier)
    expect(r.slots.get('alex')?.tier).toBe(1)
    expect(r.slots.get('nik')?.tier).toBe(0)
  })

  it('keeps disjoint married pairs on distinct tiers', () => {
    const a1 = node('a1')
    const a2 = node('a2')
    const b1 = node('b1')
    const b2 = node('b2')
    const r = tree([a1, a2, b1, b2], [
      edge('e1', 'a1', 'a2', 'married_to'),
      edge('e2', 'b1', 'b2', 'married_to'),
    ])
    expect(r.slots.get('a1')?.tier).toBe(0)
    expect(r.slots.get('a2')?.tier).toBe(0)
    expect(r.slots.get('b1')?.tier).toBe(0)
    expect(r.slots.get('b2')?.tier).toBe(0)
  })

  it('breaks parent cycles without hanging', () => {
    const a = node('a')
    const b = node('b')
    const r = tree([a, b], [
      edge('e1', 'a', 'b', 'child_of'),
      edge('e2', 'b', 'a', 'child_of'),
    ])
    expect(r.slots.size).toBe(2)
  })

  it('excludes non-person, non-family nodes entirely', () => {
    const a = node('a')
    const l = node('l', { type: 'landmark' })
    const r = tree([a, l], [edge('e1', 'a', 'l', 'born_in')])
    expect(r.slots.size).toBe(1)
    expect(r.slots.get('l')).toBeUndefined()
  })

  it('keeps children below parents when a marriage raises a parent tier', () => {
    const g1 = node('g1')
    const g2 = node('g2')
    const g3 = node('g3')
    const g4 = node('g4')
    const q = node('q')
    const p0 = node('p0')
    const p = node('p')
    const c = node('c')
    const r = tree([g1, g2, g3, g4, q, p0, p, c], [
      edge('e1', 'g2', 'g1', 'child_of'),
      edge('e2', 'g3', 'g2', 'child_of'),
      edge('e3', 'g4', 'g3', 'child_of'),
      edge('e4', 'q', 'g4', 'child_of'),
      edge('e5', 'p', 'p0', 'child_of'),
      edge('e6', 'c', 'p', 'child_of'),
      edge('e7', 'p', 'q', 'married_to'),
    ])
    expect(r.slots.get('p')?.tier).toBe(4)
    expect(r.slots.get('q')?.tier).toBe(4)
    expect(r.slots.get('c')?.tier).toBe(5) // strictly below its parent p
  })

  it('centers a child under its parents and enforces spouse gaps on tier 0', () => {
    const m1 = node('m1')
    const m2 = node('m2')
    const c = node('c')
    const r = tree([m1, m2, c], [
      edge('e1', 'c', 'm1', 'child_of'),
      edge('e2', 'c', 'm2', 'child_of'),
      edge('e3', 'm1', 'm2', 'married_to'),
    ])
    const x1 = r.slots.get('m1')!.x
    const x2 = r.slots.get('m2')!.x
    expect(Math.abs(x2 - x1)).toBe(X_SPACING)
    expect(r.slots.get('c')!.x).toBe((x1 + x2) / 2)
  })

  it('separates disconnected married pairs into non-overlapping x ranges', () => {
    const a1 = node('a1')
    const a2 = node('a2')
    const b1 = node('b1')
    const b2 = node('b2')
    const r = tree([a1, a2, b1, b2], [
      edge('e1', 'a1', 'a2', 'married_to'),
      edge('e2', 'b1', 'b2', 'married_to'),
    ])
    const xs = [...r.slots.values()]
      .filter((s) => s.tier === 0)
      .map((s) => s.x)
      .sort((a, b) => a - b)
    expect(xs.length).toBe(4)
    const gaps = xs.slice(1).map((x, i) => x - xs[i])
    expect(gaps.every((g) => g >= X_SPACING)).toBe(true)
  })

  it('keeps a married couple adjacent when both spouses anchor under far-apart parents', () => {
    // Lexicographic label order r0, r1, r10, r2, ..., r9 places the eleven
    // single roots on tier 0 at x = 0, 220, 440, 660, ..., 2200.
    const roots = Array.from({ length: 11 }, (_, i) => node(`r${i}`))
    const a = node('a')
    const b = node('b')
    const r = tree([...roots, a, b], [
      edge('e1', 'a', roots[0].id, 'child_of'), // a anchors under r0 (x = 0)
      edge('e2', 'b', roots[1].id, 'child_of'), // b's low parent r1 (x = 220)
      edge('e3', 'b', roots[9].id, 'child_of'), // b's high parent r9 (x = 2200)
      edge('e4', 'a', 'b', 'married_to'),
    ])
    const r0x = r.slots.get('r0')!.x
    const r1x = r.slots.get('r1')!.x
    const r9x = r.slots.get('r9')!.x
    const pivot = (r0x + r1x + r9x) / 3
    expect(Math.abs(r.slots.get('b')!.x - r.slots.get('a')!.x)).toBe(X_SPACING)
    expect(r.slots.get('a')!.x).toBe(pivot - X_SPACING / 2)
    expect(r.slots.get('b')!.x).toBe(pivot + X_SPACING / 2)
  })

  it('produces married and singleton couples with their family ids', () => {
    const p = node('p')
    const sp = node('sp')
    const q = node('q')
    const kid = node('kid')
    const f = node('f', { type: 'family' })
    const r = tree([p, sp, q, kid, f], [
      edge('e1', 'p', 'sp', 'married_to'),
      edge('e2', 'p', 'f', 'belongs_to_clan'),
      edge('e3', 'sp', 'f', 'belongs_to_clan'),
      edge('e4', 'kid', 'q', 'child_of'),
    ])
    const couple = r.couples.find((c) => c.members.includes('p'))
    expect(couple).toBeDefined()
    expect(couple?.familyIds).toContain('f')
    const singleton = r.couples.find((c) => c.members.includes('q'))
    expect(singleton?.members).toEqual(['q'])
  })

  it('places a family banner above its members', () => {
    const p = node('p')
    const sp = node('sp')
    const f = node('f', { type: 'family' })
    const r = tree([p, sp, f], [
      edge('e1', 'p', 'sp', 'married_to'),
      edge('e2', 'p', 'f', 'belongs_to_clan'),
      edge('e3', 'sp', 'f', 'belongs_to_clan'),
    ])
    const fs = r.slots.get('f')
    expect(fs).toBeDefined()
    expect(fs?.y).toBe(Math.min(r.slots.get('p')!.y, r.slots.get('sp')!.y) - FAMILY_INSET)
    expect(fs?.x).toBe((r.slots.get('p')!.x + r.slots.get('sp')!.x) / 2)
  })

  it('truncates at maxSlots and reports truncated', () => {
    const r = buildFamilyForest(
      [node('a'), node('b'), node('c')],
      [],
      { maxSlots: 2 },
    )
    expect(r.truncated).toBe(true)
    expect(r.slots.size).toBe(2)
    expect(r.slots.get('c')).toBeUndefined()
  })

  it('walks the depth of placed nodes', () => {
    const root = node('root')
    const g1 = node('g1')
    const g2 = node('g2')
    const r = tree([root, g1, g2], [
      edge('e1', 'g1', 'root', 'child_of'),
      edge('e2', 'g2', 'g1', 'child_of'),
    ])
    expect(r.depth).toBe(2)
  })

  it('returns an empty result when there are no persons', () => {
    const f = node('f', { type: 'family' })
    expect(buildFamilyForest([f], []).slots.size).toBe(0)
    expect(buildFamilyForest([], []).slots.size).toBe(0)
  })

  it('pushes persons with no blood/marriage/sibling link into an outcasts region', () => {
    const root = node('root')
    const kid = node('kid')
    const orphan = node('orphan')
    const r = tree(
      [root, kid, orphan],
      [edge('e', 'kid', 'root', 'child_of')],
    )
    expect(r.outcastIds.has('orphan')).toBe(true)
    expect(r.outcastIds.has('root')).toBe(false)
    expect(r.outcastIds.has('kid')).toBe(false)
    // Outcast sits far to the right of the family tree.
    const rootX = r.slots.get('root')!.x
    const orphanX = r.slots.get('orphan')!.x
    expect(orphanX).toBeGreaterThan(rootX + X_SPACING)
  })

  it('treats belongs_to_clan as affiliation, not blood, and pushes affiliates out', () => {
    const root = node('root')
    const kid = node('kid')
    const affiliate = node('affiliate')
    const f = node('f', { type: 'family' })
    const r = tree(
      [root, kid, affiliate, f],
      [
        edge('e1', 'kid', 'root', 'child_of'),
        edge('e2', 'affiliate', 'f', 'belongs_to_clan'),
      ],
    )
    expect(r.outcastIds.has('affiliate')).toBe(true)
    expect(r.outcastIds.has('root')).toBe(false)
    expect(r.outcastIds.has('kid')).toBe(false)
  })
})
