import type { GraphEdge, GraphNode, Verb } from './types'

export const TIER_HEIGHT = 150
export const X_SPACING = 220
export const FAMILY_INSET = 60

export const TREE_EDGE_VERBS: readonly Verb[] = [
  'child_of',
  'married_to',
  'belongs_to_clan',
  'sibling_of',
]

export interface TreeSlot {
  id: string
  x: number
  y: number
  tier: number
}

export interface TreeCouple {
  members: string[]
  familyIds: string[]
  tier: number
}

export interface AncestorTreeResult {
  slots: Map<string, TreeSlot>
  couples: TreeCouple[]
  depth: number
  truncated: boolean
  outcastIds: Set<string>
}

export interface FamilyLinks {
  parentsById: Map<string, string[]>
  spousesById: Map<string, string[]>
  familiesById: Map<string, string[]>
}

export interface PillBox {
  x: number
  y: number
  w: number
  h: number
}

const push = (map: Map<string, string[]>, key: string, value: string) => {
  const list = map.get(key) ?? []
  if (!list.includes(value)) list.push(value)
  map.set(key, list)
}

/**
 * Reads the documented family semantics out of the normalized graph.
 *
 * child_of: source is the child, target is the parent.
 * parent_of: source is the parent, target is the child (inverse encoding).
 * married_to: symmetric.
 * belongs_to_clan: person → family.
 */
export function resolveFamilyLinks(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): FamilyLinks {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const isPerson = (id: string) => byId.get(id)?.type === 'person'
  const isFamily = (id: string) => byId.get(id)?.type === 'family'
  const parentsById = new Map<string, string[]>()
  const spousesById = new Map<string, string[]>()
  const familiesById = new Map<string, string[]>()

  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue
    switch (e.verb) {
      case 'child_of':
        if (isPerson(e.source) && isPerson(e.target)) push(parentsById, e.source, e.target)
        break
      case 'parent_of':
        if (isPerson(e.source) && isPerson(e.target)) push(parentsById, e.target, e.source)
        break
      case 'married_to':
        if (isPerson(e.source) && isPerson(e.target)) {
          push(spousesById, e.source, e.target)
          push(spousesById, e.target, e.source)
        }
        break
      case 'belongs_to_clan':
        if (isPerson(e.source) && isFamily(e.target)) push(familiesById, e.source, e.target)
        else if (isFamily(e.source) && isPerson(e.target)) push(familiesById, e.target, e.source)
        break
      default:
        break
    }
  }

  return { parentsById, spousesById, familiesById }
}

export interface FamilyForestOptions {
  maxSlots?: number
}

/**
 * Lays out the ENTIRE person+family graph as a forest of top-down trees.
 * Generations come from longest-path layering over parent/child links, with
 * married spouses unified onto a shared tier. Every person node receives a
 * slot (subject to maxSlots), so the whole family graph lives in one
 * coordinate system and family edges stay short.
 */
export function buildFamilyForest(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  opts: FamilyForestOptions = {},
): AncestorTreeResult {
  const maxSlots = opts.maxSlots ?? 500
  const slots = new Map<string, TreeSlot>()
  const empty: AncestorTreeResult = { slots, couples: [], depth: 0, truncated: false, outcastIds: new Set() }
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const isPerson = (id: string) => byId.get(id)?.type === 'person'
  const allPersons = nodes.filter((n) => n.type === 'person')
  if (allPersons.length === 0) return empty

  const links = resolveFamilyLinks(nodes, edges)

  // 0) Split persons into "connected" (blood/marriage/sibling link) and
  //    "isolated". Isolated persons — only belongs_to_clan or no family
  //    edges at all — are pushed into a separate outcasts region in step 6
  //    so they don't pile up alongside the families in a horizontal line
  //    and don't bloat the family halos.
  const connected = new Set<string>()
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue
    if (
      e.verb === 'child_of' ||
      e.verb === 'parent_of' ||
      e.verb === 'married_to' ||
      e.verb === 'sibling_of'
    ) {
      if (isPerson(e.source) && isPerson(e.target)) {
        connected.add(e.source)
        connected.add(e.target)
      }
    }
  }
  // Non-connected persons split into:
  //   - affiliates: have a belongs_to_clan link but no blood/marriage/sibling
  //     link. They get placed on a new tier below the family's blood tree.
  //   - outcasts (outcastIds): no family edges at all. They are NOT placed
  //     in slots at all — the pin effect leaves them at their current
  //     force-simulation position so they don't get arranged into a row.
  const affiliatesByFamily = new Map<string, string[]>()
  const outcastIds = new Set<string>()
  for (const p of allPersons) {
    if (connected.has(p.id)) continue
    const fams = links.familiesById.get(p.id) ?? []
    if (fams.length === 0) {
      outcastIds.add(p.id)
      continue
    }
    // If a person belongs to multiple families, place them in the first
    // by family label (stable, predictable).
    const famsByLabel = [...fams].sort((a, b) =>
      (byId.get(a)?.label ?? '').localeCompare(byId.get(b)?.label ?? ''),
    )
    const primaryFamily = famsByLabel[0]
    const list = affiliatesByFamily.get(primaryFamily) ?? []
    list.push(p.id)
    affiliatesByFamily.set(primaryFamily, list)
  }
  // `persons` is re-scoped to the connected subset for the tree layout below.
  const persons = allPersons.filter((p) => connected.has(p.id))
  const placed: string[] = []
  let truncated = false

  // 1) Individual generations by longest-path layering over parent links.
  const tier = new Map<string, number>()
  const tierOf = (id: string): number => {
    const cached = tier.get(id)
    if (cached !== undefined) return cached
    const parents = (links.parentsById.get(id) ?? []).filter(isPerson)
    if (parents.length === 0) return 0
    tier.set(id, -1) // cycle guard marker
    const t = Math.max(
      ...parents.map((p) => {
        const pt = tierOf(p)
        return pt === -1 ? 0 : pt + 1
      }),
    )
    tier.set(id, t)
    return t
  }
  for (const p of persons) tierOf(p.id)

  // 2) Married spouses merge onto one tier per marriage component.
  const seen = new Set<string>()
  for (const p of persons) {
    if (seen.has(p.id)) continue
    const group: string[] = []
    const stack = [p.id]
    seen.add(p.id)
    while (stack.length > 0) {
      const cur = stack.pop()!
      group.push(cur)
      for (const s of links.spousesById.get(cur) ?? []) {
        if (isPerson(s) && !seen.has(s)) {
          seen.add(s)
          stack.push(s)
        }
      }
    }
    const max = Math.max(...group.map((g) => tier.get(g) ?? 0))
    for (const g of group) tier.set(g, max)
  }

  // 2b) Re-propagate so no child ends up on a tier above its parents
  //     after spouse unification raised one of the parents.
  // Bound iterations by the node count so cycles cannot loop forever.
  let changed = true
  for (let iter = 0; changed && iter <= persons.length; iter++) {
    changed = false
    for (const p of persons) {
      const parents = (links.parentsById.get(p.id) ?? []).filter(isPerson)
      if (parents.length === 0) continue
      const parentMax = Math.max(
        ...parents.map((pid) => {
          const pt = tier.get(pid)
          return pt !== undefined && pt !== -1 ? pt + 1 : 0
        }),
      )
      const cur = tier.get(p.id) ?? 0
      if (cur < parentMax) {
        tier.set(p.id, parentMax)
        changed = true
      }
    }
  }

  // 3) Group persons by tier.
  const byTier = new Map<number, string[]>()
  for (const p of persons) {
    const t = tier.get(p.id) ?? 0
    const list = byTier.get(t) ?? []
    list.push(p.id)
    byTier.set(t, list)
  }
  const maxTier = Math.max(0, ...byTier.keys())
  const topY = FAMILY_INSET
  const labelOrder = (a: string, b: string) =>
    (byId.get(a)?.label ?? '').localeCompare(byId.get(b)?.label ?? '')

  for (let t = 0; t <= maxTier; t++) {
    const row = (byTier.get(t) ?? []).sort(labelOrder)
    const x = new Map<string, number>()

    // (a) children center under the mean x of their placed parents
    for (const id of row) {
      const parents = (links.parentsById.get(id) ?? []).filter((p) => slots.has(p))
      if (parents.length > 0) {
        x.set(id, parents.reduce((sum, p) => sum + slots.get(p)!.x, 0) / parents.length)
      }
    }

    // (a2) married couples where BOTH spouses anchored under their own
    // parents get recentred as an adjacent pair under all their parents,
    // so the couple stays together even when the parents are far apart.
    const pairHandled = new Set<string>()
    for (const id of row) {
      if (pairHandled.has(id) || !x.has(id)) continue
      const spouse = (links.spousesById.get(id) ?? []).find(
        (s) => row.includes(s) && tier.get(s) === t,
      )
      if (!spouse || !x.has(spouse)) continue
      pairHandled.add(id)
      pairHandled.add(spouse)
      const allParents = [
        ...(links.parentsById.get(id) ?? []),
        ...(links.parentsById.get(spouse) ?? []),
      ].filter((p) => slots.has(p))
      if (allParents.length === 0) continue
      const pivot = allParents.reduce((sum, p) => sum + slots.get(p)!.x, 0) / allParents.length
      const [u, w] = labelOrder(id, spouse) <= 0 ? [id, spouse] : [spouse, id]
      x.set(u, pivot - X_SPACING / 2)
      x.set(w, pivot + X_SPACING / 2)
    }

    // (b) a lone anchored spouse's partner sits beside it
    for (const id of row) {
      if (x.has(id)) continue
      const spouse = (links.spousesById.get(id) ?? []).find(
        (s) => isPerson(s) && x.has(s) && tier.get(s) === t,
      )
      if (spouse) x.set(id, (x.get(spouse) ?? 0) + X_SPACING)
    }

    // (c) running cursor for the rest; married pairs share a slot pair
    let cursor = 0
    for (const id of row) {
      if (x.has(id)) continue
      const spouse = (links.spousesById.get(id) ?? []).find(
        (s) => isPerson(s) && !x.has(s) && tier.get(s) === t,
      )
      if (spouse) {
        x.set(id, cursor)
        x.set(spouse, cursor + X_SPACING)
        cursor += 2 * X_SPACING
      } else {
        x.set(id, cursor)
        cursor += X_SPACING
      }
    }

    // (d) per-tier collision pass enforces X_SPACING within the row
    const ordered = [...x.keys()].sort((a, b) => (x.get(a) ?? 0) - (x.get(b) ?? 0))
    for (let i = 1; i < ordered.length; i++) {
      const prevX = x.get(ordered[i - 1]) ?? 0
      const curX = x.get(ordered[i]) ?? 0
      if (curX - prevX < X_SPACING) x.set(ordered[i], prevX + X_SPACING)
    }

    for (const id of ordered) {
      if (placed.length >= maxSlots) {
        truncated = true
        break
      }
      slots.set(id, { id, x: x.get(id) ?? 0, y: topY + t * TIER_HEIGHT, tier: t })
      placed.push(id)
    }
  }

  // 4) Couples — married pairs on a shared tier, then singleton couples
  //    (a person with placed children but no placed spouse).
  const couples: TreeCouple[] = []
  const coupled = new Set<string>()
  for (const id of placed) {
    const t = slots.get(id)!.tier
    const spouse = (links.spousesById.get(id) ?? []).find(
      (s) => placed.includes(s) && slots.get(s)?.tier === t,
    )
    if (spouse && !coupled.has(id) && !coupled.has(spouse)) {
      const members = [id, spouse].sort(labelOrder)
      const familyIds = [...new Set(members.flatMap((m) => links.familiesById.get(m) ?? []))]
      couples.push({ members, familyIds, tier: t })
      coupled.add(id)
      coupled.add(spouse)
    }
  }
  for (const id of placed) {
    if (coupled.has(id)) continue
    const hasChild = placed.some((pid) => (links.parentsById.get(pid) ?? []).includes(id))
    if (hasChild) {
      couples.push({
        members: [id],
        familyIds: [...new Set(links.familiesById.get(id) ?? [])],
        tier: slots.get(id)!.tier,
      })
      coupled.add(id)
    }
  }

  // 5) Family banners above their members.
  for (const id of nodes.map((n) => n.id)) {
    if (byId.get(id)?.type !== 'family') continue
    const members = placed.filter((sid) => (links.familiesById.get(sid) ?? []).includes(id))
    if (members.length === 0) continue
    const memberSlots = members.map((m) => slots.get(m)!)
    const minY = Math.min(...memberSlots.map((s) => s.y))
    const midX = memberSlots.reduce((sum, s) => sum + s.x, 0) / memberSlots.length
    const memberTier = Math.min(...memberSlots.map((s) => s.tier))
    slots.set(id, { id, x: midX, y: minY - FAMILY_INSET, tier: memberTier })
  }

  // 6) Outcasts region: persons with no blood/marriage/sibling link are
  //    placed far to the right of the families, on a single tier-0 row, so
  //    they don't extend the family halos or crowd the tree layout.
  // 6) Affiliates (belongs_to_clan only, no blood link) get placed on a
  //    new tier directly below the family's blood tree, so they show up
  //    in the family halo but are visually distinguished by being on a
  //    new row.
  //    Outcasts (no family edges at all) are NOT placed in slots — the
  //    pin effect leaves them at their current force-simulation position.
  // Build childrenByParent (child → parents) so we can compute the
  // family's blood subtree depth (the family members + all their blood
  // descendants, even those who haven't been recorded as belonging to
  // the clan). The affiliate tier sits strictly below that depth.
  const childrenByParent = new Map<string, string[]>()
  for (const p of persons) {
    for (const par of links.parentsById.get(p.id) ?? []) {
      push(childrenByParent, par, p.id)
    }
  }
  for (const [familyId, affiliates] of affiliatesByFamily) {
    const familyMemberIds = new Set(
      placed.filter((pid) => (links.familiesById.get(pid) ?? []).includes(familyId)),
    )
    if (familyMemberIds.size === 0) continue
    // BFS through blood descendants to find the deepest tier in the
    // family's blood subtree.
    const subtreeIds = new Set<string>(familyMemberIds)
    const stack = [...familyMemberIds]
    let familyMaxTier = 0
    for (const id of familyMemberIds) {
      familyMaxTier = Math.max(familyMaxTier, slots.get(id)?.tier ?? 0)
    }
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const child of childrenByParent.get(cur) ?? []) {
        if (subtreeIds.has(child)) continue
        if (!slots.has(child)) continue
        subtreeIds.add(child)
        familyMaxTier = Math.max(familyMaxTier, slots.get(child)!.tier)
        stack.push(child)
      }
    }
    const familyMinX = Math.min(
      ...[...subtreeIds].map((id) => slots.get(id)!.x),
    )
    const affiliateTier = familyMaxTier + 1
    const ordered = affiliates
      .map((aid) => ({ id: aid, label: byId.get(aid)?.label ?? '' }))
      .sort((a, b) => a.label.localeCompare(b.label))
    let cursor = familyMinX
    for (const { id } of ordered) {
      if (placed.length >= maxSlots) {
        truncated = true
        break
      }
      slots.set(id, { id, x: cursor, y: topY + affiliateTier * TIER_HEIGHT, tier: affiliateTier })
      placed.push(id)
      cursor += X_SPACING
    }
  }

  return {
    slots,
    couples,
    depth: placed.reduce((mx, id) => Math.max(mx, slots.get(id)!.tier), 0),
    truncated,
    outcastIds,
  }
}

/** Picks the earliest-born person node (birth year from subtitle, ties by label). */
export function pickFocalPerson(nodes: readonly GraphNode[]): GraphNode | null {
  const persons = nodes.filter((n) => n.type === 'person')
  if (persons.length === 0) return null
  const birthYear = (n: GraphNode): number => {
    const m = (n.subtitle ?? '').match(/(?:1|2)\d{3}/)
    return m ? Number(m[0]) : Number.POSITIVE_INFINITY
  }
  return [...persons].sort(
    (a, b) => birthYear(a) - birthYear(b) || a.label.localeCompare(b.label),
  )[0]
}

/** Filters a full graph projection down to tree slots + family edges. */
export function filterTreeData(
  nodes: readonly GraphNode[],
  links: readonly GraphEdge[],
  slots: Map<string, TreeSlot>,
): { nodes: GraphNode[]; links: GraphEdge[] } {
  const keep = (id: string) => slots.has(id)
  return {
    nodes: nodes.filter((n) => keep(n.id)),
    links: links.filter(
      (l) => TREE_EDGE_VERBS.includes(l.verb) && keep(l.source) && keep(l.target),
    ),
  }
}

/**
 * Orthilinear parent→child connector: parent bottom edge, vertical, horizontal,
 * vertical, child top edge.
 */
export function parentChildPath(
  parent: PillBox,
  child: PillBox,
): { px: number; py: number; mx: number; my: number; cx: number; cy: number } {
  const px = parent.x
  const py = parent.y + parent.h / 2
  const cx = child.x
  const cy = child.y - child.h / 2
  const my = (py + cy) / 2
  return { px, py, mx: cx, my, cx, cy }
}

/**
 * personId -> family ids (sorted by family label) for every person that
 * belongs to at least one clan.
 */
export function personClans(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): Map<string, string[]> {
  const links = resolveFamilyLinks(nodes, edges)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out = new Map<string, string[]>()
  for (const [personId, familyIds] of links.familiesById) {
    out.set(
      personId,
      [...familyIds].sort((a, b) =>
        (byId.get(a)?.label ?? '').localeCompare(byId.get(b)?.label ?? ''),
      ),
    )
  }
  return out
}

/**
 * familyId -> member person ids (sorted by person label) for clans that have
 * at least one member.
 */
export function clanMembers(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): Map<string, string[]> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out = new Map<string, string[]>()
  for (const [personId, familyIds] of personClans(nodes, edges)) {
    for (const familyId of familyIds) {
      const list = out.get(familyId) ?? []
      list.push(personId)
      out.set(familyId, list)
    }
  }
  for (const members of out.values()) {
    members.sort((a, b) =>
      (byId.get(a)?.label ?? '').localeCompare(byId.get(b)?.label ?? ''),
    )
  }
  return out
}
