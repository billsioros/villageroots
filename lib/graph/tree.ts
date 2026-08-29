import type { GraphEdge, GraphNode, Verb } from './types'

export const TIER_HEIGHT = 150
export const X_SPACING = 220
export const FAMILY_INSET = 60

/**
 * Minimum guaranteed clearance (graph units) between two neighbouring
 * families' enclosing-circle halos. The per-column gap is
 * reach_i + reach_{i+1} + FAMILY_CLUSTER_MARGIN, which absorbs the pill-width
 * estimation error and the halo's screen-space padding.
 */
export const FAMILY_CLUSTER_MARGIN = 200

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
 * Lays out the entire person+family graph as a forest of top-down trees,
 * clustered into per-family columns.
 *
 * Every person in a blood/marriage/sibling link is assigned to a column:
 * - a person who belongs to a family (belongs_to_clan) is placed in that
 *   family's column (first family by label if several);
 * - a clan-less person goes to the column of the family their relatives
 *   (spouse, parents, children) belong to;
 * - a connected chain with no family at all becomes a single "unaffiliated"
 *   column placed last;
 * - affiliates (belongs_to_clan only, no blood link) are placed on a new
 *   tier below their family's column;
 * - truly isolated persons (no family edges) receive no slot at all.
 *
 * Columns are laid out independently and separated by a gap
 * reach_i + reach_{i+1} + FAMILY_CLUSTER_MARGIN, chosen so that each family's
 * enclosing circle contains exactly its column's members and no two circles
 * touch. Cross-column edges (e.g. an intermarriage) are drawn as edges
 * between the separated columns but never influence the layout itself.
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
  const labelOf = (id: string) => byId.get(id)?.label ?? ''
  const allPersons = nodes.filter((n) => n.type === 'person')
  if (allPersons.length === 0) return empty

  const links = resolveFamilyLinks(nodes, edges)

  // 0) Split persons into "connected" (blood/marriage/sibling link) and
  //    "isolated".
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
  //     link. They are placed on a new tier below their family's column.
  //   - outcasts (outcastIds): no family edges at all. They are never given a
  //     slot — the pin effect leaves them at their current force-simulation
  //     position.
  const affiliatesByFamily = new Map<string, string[]>()
  const outcastIds = new Set<string>()
  for (const p of allPersons) {
    if (connected.has(p.id)) continue
    const fams = links.familiesById.get(p.id) ?? []
    if (fams.length === 0) {
      outcastIds.add(p.id)
      continue
    }
    // If a person belongs to multiple families, place them in the first by
    // family label (stable, predictable).
    const primaryFamily = [...fams].sort((a, b) => labelOf(a).localeCompare(labelOf(b)))[0]
    const list = affiliatesByFamily.get(primaryFamily) ?? []
    list.push(p.id)
    affiliatesByFamily.set(primaryFamily, list)
  }
  const persons = allPersons.filter((p) => connected.has(p.id))

  // child -> parents, needed for the effective-family assignment below and for
  // computing each family column's affiliate tier.
  const childrenByParent = new Map<string, string[]>()
  for (const p of persons) {
    for (const par of links.parentsById.get(p.id) ?? []) {
      push(childrenByParent, par, p.id)
    }
  }

  // 0.5) Effective family for every connected person: their own primary
  //      family, or — for a clan-less person — the family their relatives
  //      (spouse, parents, children) belong to. A clan-less spouse therefore
  //      lands inside the partner's family column and halo.
  const effective = new Map<string, string>()
  for (const p of persons) {
    const own = links.familiesById.get(p.id) ?? []
    if (own.length > 0) {
      effective.set(p.id, [...own].sort((a, b) => labelOf(a).localeCompare(labelOf(b)))[0])
      continue
    }
    const counts = new Map<string, number>()
    const neighbors = new Set([
      ...(links.spousesById.get(p.id) ?? []),
      ...(links.parentsById.get(p.id) ?? []),
      ...(childrenByParent.get(p.id) ?? []),
    ])
    for (const nid of neighbors) {
      for (const f of links.familiesById.get(nid) ?? []) {
        counts.set(f, (counts.get(f) ?? 0) + 1)
      }
    }
    if (counts.size > 0) {
      const best = [...counts.entries()].sort(
        (a, b) => b[1] - a[1] || labelOf(a[0]).localeCompare(labelOf(b[0])),
      )[0][0]
      effective.set(p.id, best)
    }
  }

  // 0.6) Column groups: one per family (sorted by family label), then one
  //      unaffiliated column for the remaining connected persons, placed last.
  const familyColumns = new Map<string, string[]>()
  for (const p of persons) {
    const f = effective.get(p.id)
    if (!f) continue
    const list = familyColumns.get(f) ?? []
    list.push(p.id)
    familyColumns.set(f, list)
  }
  const familyIds = [...familyColumns.keys()].sort((a, b) => labelOf(a).localeCompare(labelOf(b)))
  const unaffiliated = persons.filter((p) => !effective.has(p.id)).map((p) => p.id)

  // Per-column layout: longest-path tiers, spouse unification, per-tier x
  // placement, then affiliates below the family's blood subtree. All in
  // column-local coordinates.
  const topY = FAMILY_INSET
  const layoutColumn = (
    memberIds: string[],
    familyId: string | null,
  ): { pos: Map<string, { x: number; y: number; tier: number }>; minX: number; width: number; reach: number } => {
    const pos = new Map<string, { x: number; y: number; tier: number }>()
    if (memberIds.length > 0) {
      const memberSet = new Set(memberIds)
      // Intra-column links only — cross-column edges never influence layout.
      const subParents = new Map<string, string[]>()
      const subSpouses = new Map<string, string[]>()
      for (const m of memberIds) {
        const pars = (links.parentsById.get(m) ?? []).filter((x) => memberSet.has(x))
        if (pars.length > 0) subParents.set(m, pars)
        const sps = (links.spousesById.get(m) ?? []).filter((x) => memberSet.has(x))
        if (sps.length > 0) subSpouses.set(m, sps)
      }

      // 1) Individual generations by longest-path layering over parent links.
      const tier = new Map<string, number>()
      const tierOf = (id: string): number => {
        const cached = tier.get(id)
        if (cached !== undefined) return cached
        const parents = subParents.get(id) ?? []
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
      const labelOrder = (a: string, b: string) => labelOf(a).localeCompare(labelOf(b))
      for (const m of memberIds) tierOf(m)

      // 2) Married spouses merge onto one tier per marriage component.
      const seen = new Set<string>()
      for (const m of memberIds) {
        if (seen.has(m)) continue
        const group: string[] = []
        const stack = [m]
        seen.add(m)
        while (stack.length > 0) {
          const cur = stack.pop()!
          group.push(cur)
          for (const s of subSpouses.get(cur) ?? []) {
            if (!seen.has(s)) {
              seen.add(s)
              stack.push(s)
            }
          }
        }
        const max = Math.max(...group.map((g) => tier.get(g) ?? 0))
        for (const g of group) tier.set(g, max)
      }

      // 2b) Re-propagate so no child ends up on a tier above its parents after
      //     spouse unification raised one of the parents.
      let changed = true
      for (let iter = 0; changed && iter <= memberIds.length; iter++) {
        changed = false
        for (const m of memberIds) {
          const parents = subParents.get(m) ?? []
          if (parents.length === 0) continue
          const parentMax = Math.max(
            ...parents.map((pid) => {
              const pt = tier.get(pid)
              return pt !== undefined && pt !== -1 ? pt + 1 : 0
            }),
          )
          const cur = tier.get(m) ?? 0
          if (cur < parentMax) {
            tier.set(m, parentMax)
            changed = true
          }
        }
      }

      // 3) Group members by tier.
      const byTier = new Map<number, string[]>()
      for (const m of memberIds) {
        const t = tier.get(m) ?? 0
        const list = byTier.get(t) ?? []
        list.push(m)
        byTier.set(t, list)
      }
      const maxTier = Math.max(0, ...byTier.keys())

      for (let t = 0; t <= maxTier; t++) {
        const row = (byTier.get(t) ?? []).sort(labelOrder)
        const x = new Map<string, number>()

        // (a) children center under the mean x of their placed parents
        for (const id of row) {
          const parents = (subParents.get(id) ?? []).filter((p) => pos.has(p))
          if (parents.length > 0) {
            x.set(id, parents.reduce((sum, p) => sum + pos.get(p)!.x, 0) / parents.length)
          }
        }

        // (a2) married couples where BOTH spouses anchored under their own
        // parents get recentred as an adjacent pair under all their parents.
        const pairHandled = new Set<string>()
        for (const id of row) {
          if (pairHandled.has(id) || !x.has(id)) continue
          const spouse = (subSpouses.get(id) ?? []).find(
            (s) => row.includes(s) && tier.get(s) === t,
          )
          if (!spouse || !x.has(spouse)) continue
          pairHandled.add(id)
          pairHandled.add(spouse)
          const allParents = [
            ...(subParents.get(id) ?? []),
            ...(subParents.get(spouse) ?? []),
          ].filter((p) => pos.has(p))
          if (allParents.length === 0) continue
          const pivot = allParents.reduce((sum, p) => sum + pos.get(p)!.x, 0) / allParents.length
          const [u, w] = labelOrder(id, spouse) <= 0 ? [id, spouse] : [spouse, id]
          x.set(u, pivot - X_SPACING / 2)
          x.set(w, pivot + X_SPACING / 2)
        }

        // (b) a lone anchored spouse's partner sits beside it
        for (const id of row) {
          if (x.has(id)) continue
          const spouse = (subSpouses.get(id) ?? []).find(
            (s) => x.has(s) && tier.get(s) === t,
          )
          if (spouse) x.set(id, (x.get(spouse) ?? 0) + X_SPACING)
        }

        // (c) running cursor for the rest; married pairs share a slot pair
        let cursor = 0
        for (const id of row) {
          if (x.has(id)) continue
          const spouse = (subSpouses.get(id) ?? []).find(
            (s) => !x.has(s) && tier.get(s) === t,
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
          pos.set(id, { x: x.get(id) ?? 0, y: topY + t * TIER_HEIGHT, tier: t })
        }
      }
    }

    // Affiliates (belongs_to_clan only, no blood link) are placed on a new
    // tier directly below the family's blood subtree, so they show up in the
    // family halo but are visually distinguished by being on a new row.
    if (familyId) {
      const affiliates = affiliatesByFamily.get(familyId) ?? []
      const declared = memberIds.filter((m) => (links.familiesById.get(m) ?? []).includes(familyId))
      if (affiliates.length > 0 && declared.length > 0) {
        // BFS through the family's blood descendants to find the deepest tier
        // in the family's subtree; the affiliate tier sits strictly below it.
        const subtreeIds = new Set(declared)
        const stack = [...declared]
        let familyMaxTier = Math.max(...declared.map((d) => pos.get(d)?.tier ?? 0))
        while (stack.length > 0) {
          const cur = stack.pop()!
          for (const child of childrenByParent.get(cur) ?? []) {
            if (subtreeIds.has(child) || !pos.has(child)) continue
            subtreeIds.add(child)
            familyMaxTier = Math.max(familyMaxTier, pos.get(child)!.tier)
            stack.push(child)
          }
        }
        const familyMinX = Math.min(...[...subtreeIds].map((id) => pos.get(id)!.x))
        const affiliateTier = familyMaxTier + 1
        const ordered = affiliates.map((aid) => ({ id: aid, label: labelOf(aid) })).sort((a, b) => a.label.localeCompare(b.label))
        let cursor = familyMinX
        for (const { id } of ordered) {
          pos.set(id, { x: cursor, y: topY + affiliateTier * TIER_HEIGHT, tier: affiliateTier })
          cursor += X_SPACING
        }
      }
    }

    // Enclosing-circle estimate (mirrors the canvas: pillW = label*7.6 + 69,
    // pillH = 40, corner-to-centroid radius + 60 padding).
    if (pos.size === 0) return { pos, minX: 0, width: 0, reach: 0 }
    let minX = Infinity
    let maxX = -Infinity
    let sx = 0
    let sy = 0
    for (const [id, p] of pos) {
      const w = labelOf(id).length * 7.6 + 69
      minX = Math.min(minX, p.x - w / 2)
      maxX = Math.max(maxX, p.x + w / 2)
      sx += p.x
      sy += p.y
    }
    const cx = sx / pos.size
    const cy = sy / pos.size
    let r = 0
    for (const [id, p] of pos) {
      const w = labelOf(id).length * 7.6 + 69
      r = Math.max(r, Math.hypot(Math.abs(p.x - cx) + w / 2, Math.abs(p.y - cy) + 20))
    }
    r += 60
    const width = maxX - minX
    return { pos, minX, width, reach: Math.max(0, r - width / 2) }
  }

  // 4) Lay every column out independently, then place columns left-to-right
  //    with a gap (reach_i + reach_{i+1} + margin) so the enclosing circles
  //    of neighbouring families can never overlap.
  const columns: ReturnType<typeof layoutColumn>[] = []
  for (const fid of familyIds) columns.push(layoutColumn(familyColumns.get(fid) ?? [], fid))
  if (unaffiliated.length > 0) columns.push(layoutColumn(unaffiliated, null))

  const placed: string[] = []
  let truncated = false
  let startX = 0
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    // Integer shift keeps slot coordinates on the exact X_SPACING grid that
    // couples and children are computed on; the sub-pixel leftover (≤ 0.5
    // graph units) is negligible next to the halo padding and cluster margin.
    const shift = Math.round(startX - col.minX)
    for (const [id, p] of col.pos) {
      if (placed.length >= maxSlots) {
        truncated = true
        break
      }
      slots.set(id, { id, x: p.x + shift, y: p.y, tier: p.tier })
      placed.push(id)
    }
    if (i < columns.length - 1) {
      startX += col.width + col.reach + columns[i + 1].reach + FAMILY_CLUSTER_MARGIN
    }
  }

  // 5) Couples — married pairs on a shared tier, then singleton couples (a
  //    person with placed children but no placed spouse).
  const couples: TreeCouple[] = []
  const coupled = new Set<string>()
  for (const id of placed) {
    const t = slots.get(id)!.tier
    const spouse = (links.spousesById.get(id) ?? []).find(
      (s) => placed.includes(s) && slots.get(s)?.tier === t,
    )
    if (spouse && !coupled.has(id) && !coupled.has(spouse)) {
      const members = [id, spouse].sort((a, b) => labelOf(a).localeCompare(labelOf(b)))
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

  // 6) Family banners above their declared members.
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
 * at least one direct belongs_to_clan edge, expanded to the person-closure:
 * anyone reachable from a direct member through child_of / parent_of /
 * married_to edges — but only if they don't have a belongs_to_clan edge of
 * their own. This matches the natural reading that a spouse of a clan
 * member is a clan member too (e.g. Maria Katsari, married to Nikolas
 * Katsaris, is in the Katsaris family even though she has no belongs_to_clan
 * edge of her own), while a person who belongs to their own family is not
 * pulled into a spouse's family (Eleni Katsaris, married to Alexandros
 * Vasiliou, stays in Katsaris and is not in Vasiliou's halo).
 */
export function clanMembers(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): Map<string, string[]> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const links = resolveFamilyLinks(nodes, edges)

  // Undirected person-to-person adjacency: parents (so children can reach
  // their parents and vice versa) + spouses.
  const adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (!byId.has(a) || !byId.has(b)) return
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }
  for (const [child, parents] of links.parentsById) {
    for (const p of parents) link(child, p)
  }
  for (const [person, spouses] of links.spousesById) {
    for (const s of spouses) link(person, s)
  }

  // Compute the closure from each direct belongs_to_clan member once.
  // The BFS crosses into a person only if they do not have a belongs_to_clan
  // edge of their own — a person who belongs to another family stays in
  // their own family and is not pulled into a spouse's family by marriage.
  const closures = new Map<string, Set<string>>()
  for (const directMember of links.familiesById.keys()) {
    if (closures.has(directMember)) continue
    const reached = new Set<string>([directMember])
    const queue: string[] = [directMember]
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const next of adj.get(cur) ?? []) {
        if (reached.has(next)) continue
        if (links.familiesById.has(next)) continue
        reached.add(next)
        queue.push(next)
      }
    }
    closures.set(directMember, reached)
  }

  // Union closures across all direct members of each family.
  const out = new Map<string, string[]>()
  for (const [directMember, familyIds] of links.familiesById) {
    const reached = closures.get(directMember)!
    for (const familyId of familyIds) {
      const existing = out.get(familyId) ?? []
      for (const id of reached) {
        if (!existing.includes(id)) existing.push(id)
      }
      out.set(familyId, existing)
    }
  }

  for (const members of out.values()) {
    members.sort((a, b) =>
      (byId.get(a)?.label ?? '').localeCompare(byId.get(b)?.label ?? ''),
    )
  }
  return out
}
