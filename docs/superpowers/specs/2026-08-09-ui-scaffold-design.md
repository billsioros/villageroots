# VillageRoots UI Scaffold — Design Spec

Date: 2026-08-09
Status: Approved
Source of truth: `design/mockup.html` (Airbnb-derived design system contract, 1805-line vanilla JS prototype)

## 1. Context & Goal

VillageRoots is an infinite 2D spatial knowledge graph of village heritage. The product is not implemented yet; the codebase is the stock Next.js (App Router) + Supabase `with-supabase` starter plus design docs.

Goal: scaffold the application UI as a **full interactive port** of `design/mockup.html` — every panel and interaction from the mockup, wired to typed mock data, client-side only (no backend), reusing the existing auth flow.

The authoritative architecture (per "Technical Analysis & Architecture Desi.md") targets Next.js + Supabase (PostgreSQL + pgvector), with planned libraries `react-force-graph`, TipTap, Zustand, `@tanstack/react-query`. This scaffold introduces **Zustand** (state) and **react-force-graph-2d** (canvas) now; TipTap and react-query remain future work.

## 2. Decisions (user-approved)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Scope | **Full interactive port** — every panel + interaction from the mockup, wired to mock data, client-side only, no backend. |
| 2 | Routing | **Reuse `/protected`** — the graph app replaces the placeholder protected page. |
| 3 | Styling | **Translate to Tailwind** with tokens as a configurable theme (shadcn pattern: CSS vars in `globals.css` mapped via `theme.extend`). |
| 4 | State | **Add Zustand now** (planned in the architecture doc). |
| 5 | Theme mode | **Light-only** tokens for the scaffold; dark mode later as a token extension. |
| 6 | Canvas | **react-force-graph-2d** (the architecture doc's planned lib) instead of a faithful DOM port. |
| 7 | Canvas mode | **Force-directed (simulation on)** — nodes auto-arrange by link topology; mockup coordinates become seed positions only; spatial semantics dropped. |
| 8 | Starter template | Remove starter cruft; **one unified shadcn-style token system**, no dual token sets. |
| 9 | Auth | **Keep the auth flow** (it gates `/protected`) but **align styling** with the mockup theme. |
| 10 | Grid | Keep the mockup's **criss-cross grid styling** (16px minor / 80px major) as a background layer. |
| 11 | Toasts | **Discreet global toast** system at **bottom-right** for errors and confirmations (mockup's toast was bottom-center). |

## 3. Theme System (Section 1)

### 3.1 Token contract

Replace the template shadcn HSL variables in `app/globals.css` with the VillageRoots contract, expressed as HSL triplets (so Tailwind opacity modifiers and future dark mode work). All in `:root`, light-only, dark-ready.

**Core (shadcn-compatible names):**

| Var | Value (HSL) | Notes |
|-----|-------------|-------|
| `--background` | `0 0% 100%` | #fff |
| `--foreground` | `0 0% 13%` | #222 (`--fg`) |
| `--card` / `--popover` | `0 0% 100%` | surface |
| `--primary` | `351 100% 61%` | accent #ff385c |
| `--primary-foreground` | `0 0% 100%` | `--accent-on` |
| `--secondary` | `0 0% 100%` | surface (buttons w/ border) |
| `--secondary-foreground` | `0 0% 13%` | |
| `--muted` | `0 0% 42%` | #6a6a6a |
| `--muted-foreground` | `0 0% 42%` | |
| `--accent` | `351 100% 61%` | brand pink (mockup's "accent") |
| `--accent-foreground` | `0 0% 100%` | on-accent text |
| `--border` | `0 0% 87%` | #ddd |
| `--input` | `0 0% 87%` | |
| `--ring` | `0 0% 13%` | focus-ring = foreground |
| `--destructive` | `13 71% 42%` | #c13515 (danger) |
| `--destructive-foreground` | `0 0% 100%` | |

> Semantic mapping note: shadcn's default `--accent` is a gray hover-tint and its `--secondary` is a gray chip. This scaffold intentionally re-binds them to the mockup's language: `accent` = brand pink (hover states like dropdown items render pink-tinted), `secondary` = white surface with border (mockup `.btn-secondary`). This diverges from shadcn defaults on purpose and is the single place that intent lives.

**Extended tokens (keep contract granularity):**

| Var | Value |
|-----|-------|
| `--surface-warm` | `0 0% 97%` (#f7f7f7) |
| `--fg-2` | `0 0% 25%` (#3f3f3f) |
| `--meta` | `0 0% 57%` (#929292) |
| `--border-soft` | `0 0% 92%` (#ebebeb) |
| `--accent-hover` | `350 79% 50%` (#e31c5f) |
| `--accent-active` | `347 95% 46%` (#e00b41) |
| `--success` | `123 100% 26%` (#008a05) |
| `--warn` | `35 100% 38%` (#c47700) |
| `--accent-soft` | derived via `color-mix(in oklab, hsl(351 100% 61%) 10%, hsl(0 0% 100%))` |
| `--fg-soft` | derived via `color-mix(in oklab, hsl(0 0% 13%) 5%, hsl(0 0% 100%))` |
| `--fg-soft-2` | derived via `color-mix(in oklab, hsl(0 0% 13%) 9%, hsl(0 0% 100%))` |

**Layout / radius / elevation / motion:**

- Radius: `sm` 8px, `md` 14px, `lg` 20px, `pill` 9999px (tailwind `borderRadius` mapping: `sm→8px`, `md→14px`, `lg→20px`; `pill` used via `rounded-full`).
- Elevation: `--shadow-elev-1`: `0 1px 2px rgba(0,0,0,.05), 0 2px 8px rgba(0,0,0,.06)`; `--shadow-elev-raised`: same family, stronger.
- Focus ring: `0 0 0 2px var(--ring)`.
- Motion: 150/200ms, `cubic-bezier(.2, 0, 0, 1)`.
- Layout: `--topbar-h` 64px, `--panel-w` 400px, container max 1280px.

### 3.2 Tailwind mapping

`tailwind.config.ts` `theme.extend` maps `colors` (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring + extended: `surface-warm`, `fg-2`, `meta`, `border-soft`, `accent-hover`, `accent-active`, `success`, `warn`, `accent-soft`, `fg-soft`, `fg-soft-2`), `borderRadius`, `boxShadow`, and `fontFamily` to the CSS vars. **Single re-theme point.**

Font: keep bundled **Geist** as the sans font (Airbnb Cereal is proprietary; the mockup's fallback stack confirms system-ui is acceptable). Mono: `ui-monospace, SFMono-Regular, Menlo, monospace`.

### 3.3 Starter removal

Delete: `components/tutorial/*`, `components/hero.tsx`, `components/deploy-button.tsx`, `components/env-var-warning.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx`, `components/theme-switcher.tsx`. Trim `components/ui/*` to what is used (keep button, input, label, card, badge, checkbox, dropdown-menu; these restyle automatically from the token swap). Replace the `/` landing page with a minimal VillageRoots page (brand mark + auth CTA) in the unified theme. Auth pages are kept and re-themed automatically.

## 4. Project Structure & State (Section 2)

### 4.1 Files

```
app/
  page.tsx                    → minimal VillageRoots landing (brand + auth CTA)
  protected/
    layout.tsx                → keeps Supabase user fetch + LogoutButton (re-themed)
    page.tsx                  → <GraphApp /> (replaces placeholder)
  auth/*                      → unchanged routes, re-themed automatically
components/
  graph/                      → new app components (see Section 5)
lib/
  graph/
    types.ts                  → Node, Edge, NodeType, EdgeKind, Verb, ReviewItem, DocumentData, ChatMessage
    data.ts                   → typed port of the mockup's NODES/EDGES/SUGGESTIONS/REVIEW seed
    helpers.ts                → id/name lookup, type meta (label, color, mark), verb→kind map, legend counts
store/
  graphStore.ts               → single Zustand store (slices below)
```

### 4.2 Zustand store (single store, typed slices)

- **graphSlice** — `nodes`, `edges`, `suggestedEdges`; actions: `addNode`, `addEdge`, `removeEdge`, `approveEdge` (promote a suggested edge into `edges`).
- **uiSlice** — `selectedId`, `sidepanelOpen`, `sidepanelTab` ('document' | 'relations'), `chatOpen`, `chatCollapsed`, `searchOpen`, `layersOpen`, `modal` ('new-node' | 'ocr' | 'about' | null), `reviewOpen`, `toast` ({ message, tone: 'info' | 'error' } | null); toggle/close actions; `showToast(message, tone?)` with auto-hide timer.
- **visibilitySlice** — `hiddenTypes: Set<NodeType>`, `kindOn: Record<EdgeKind, boolean>`, `suggestOn: boolean`; toggle actions.
- **reviewSlice** — `queue: ReviewItem[]` (seeded r1–r3); `badge = queue.length` (derived); `resolve(id, approved)`.
- **chatSlice** — `messages: ChatMessage[]` ({ role: 'user' | 'ai', text, pathIds?, pathEdgeIds? }); `send(text)` implements the mockup's canned keyword responses (mill / kalyvia / church / fallback); chips send preset prompts.
- **flashSlice** — `flashIds: string[]` (search matches), `litIds: string[]`, `litEdgeIds: string[]` (chat path highlight); actions `flash(id)`/`flashMany(ids)` and `lit(ids, edgeIds)` with auto-clear timers (flash 1.8s, lit 6s).

### 4.3 Typed mock data

Port of the mockup's dataset; the authoritative source is `design/mockup.html` (NODES, EDGES, SUGGESTIONS, REVIEW seed, and per-type fact rows). The scaffold's `lib/graph/data.ts` is a direct typed port of that file's data.

- **18 nodes** (persons p-nikolas, p-maria, p-yiannis, p-eleni, p-alexandros; families f-katsaris, f-vasiliou; landmarks l-church, l-mill, l-bridge, l-plane; toponyms t-petra, t-kalyvia, t-lakka; events e-charter, e-school, e-feast, e-emigrate; path d-drakia), each `{ id, type, name, seedX, seedY, sub, initial, data }` where `data` carries per-type facts (born/died/role/audio for persons; built/registries for landmarks; origin for families; etc.).
- **20 edges** grouped by kind: social (CHILD_OF, MARRIED_TO, SIBLING_OF, BELONGS_TO_CLAN), geo (OWNS_LAND_AT, LIVED_AT, FARMED_AT), hist (BAPTIZED_AT, BURIED_AT, RAN_BY, BUILT_BY, PARTICIPATED_IN, GATHERED_AT); each `{ id, from, to, verb, kind }`.
- **2 suggested edges** (`s1` yiannis SIBLING_OF eleni 82% social; `s2` alexandros OWNS_LAND_AT lakka 67% geo) with confidence.
- **3 review items**: r1 relation (sibling link prediction), r2 node (Stavros Katsaris b.1906), r3 ocr (1924 christening ledger batch).
- **Rich biography** for p-nikolas including the blockquote "He ground wheat for every household in the hollow — nobody was turned away, even in the hungry years." (Village oral archive); other nodes get placeholder bio + `.ph-line` hint.

`seedX/seedY` become initial positions only (force simulation re-arranges). `CLUSTERS` data is dropped (not rendered).

## 5. Component Tree (Section 3)

All new components in `components/graph/`, styled with shadcn `ui/*` primitives + theme tokens:

```
components/graph/
  GraphApp.tsx              → composition root; mounts everything
  Topbar.tsx                → brand mark + "VillageRoots", crumb "Potidaneia · Fokida",
                              review bell (badge = queue.length), avatar "EK"
  GraphCanvas.tsx           → react-force-graph-2d; nodes/links rendering, selection,
                              node drag, pan/zoom; custom nodeCanvasObject + link styling
  GraphGrid.tsx             → fixed SVG criss-cross grid (16px minor / 80px major) behind canvas
  Legend.tsx                → type legend (marks) + live counts per type
  StageUi.tsx               → zoom −/+/% + fit button; readout "N nodes · 1.00×"
  Dock.tsx                  → 4 round buttons: search ⌘K, new node +, import doc, layers
  SearchPop.tsx             → search overlay w/ flash-on-match behavior
  LayersPop.tsx             → 3 kind toggles (social/geo/hist) + AI-suggestions switch + roadmap link
  WelcomeCard.tsx           → onboarding card, auto-dismiss 8s, close button
  HintChip.tsx              → "Drag to pan · scroll to zoom · click a node" appears 8.8s
  SidePanel.tsx             → Document | Relations tabs + close; 400px wide; shifts chat when open
  DocumentPanel.tsx         → cover, badges, facts dl, markdown editor (toolbar + contenteditable), embeds, footer (status + Report + Save)
  RelationsPanel.tsx        → relation list + add-relation form (pending → review queue)
  ChatPanel.tsx             → GraphRAG chat: header, messages, chips, input; collapsed state
  ChatFab.tsx               → "Ask the village" pill; hidden when chat open
  ReviewQueue.tsx           → full-screen overlay, filter chips, cards, approve/reject, empty state
  Modals.tsx                → NewNodeModal, OcrModal, AboutModal (shared Scrim)
  Toast.tsx                 → bottom-right discreet pill, auto-hide, error/info tones
```

### Integration with `/protected`

- `app/protected/layout.tsx` keeps the Supabase user fetch + `LogoutButton`; `protected/page.tsx` renders `<GraphApp />` as a full-viewport client component (`"use client"`).
- Body overflow hidden (mockup), content fills viewport below the 64px topbar.
- `proxy.ts` already whitelists `/protected`; no routing changes.

## 6. Interactions (Section 4)

### 6.1 Ported 1:1

- **Selection**: click node → sidepanel opens with document, chat shifts left; click empty canvas / Escape → deselect & close.
- **Review queue**: bell opens overlay; filter chips All/Relations/Nodes/OCR; approve/reject removes item, badge syncs, empty state ("Queue is clear").
- **Modals**: New node (type select + name input, required; creates node, queues review, shows on canvas), OCR (drop-zone → simulated progress steps → prefilled review fields + 91% confidence → submit queues review item), About (roadmap phases 01–04 with live/beta pills); scrim click / Escape closes.
- **Search**: ⌘K opens + focuses; typing flashes matches (1.8s); exactly 1 match selects it; >1 → toast with count.
- **Layers**: kind toggles hide/show edge groups; AI-suggestions switch hides suggested edges (+ any suggestion chips).
- **Add relation**: verb select + target name input; validates target exists and no self-link; on success pushes pending edge + review item + toast "Relation added · queued for review".
- **Save / Report**: toasts "Saved — changes queued for a village editor" / "Flagged for review".
- **Chat**: keyword-canned answers — "mill" → mill answer + path highlight (l-mill, p-nikolas, p-yiannis + edges e-mill-nikolas, e-nik-yiannis) + "View the path on canvas" button; "kalyvia" → fields answer; church/agios/ioannis → 1742 registry answer; else fallback. 700ms simulated delay.
- **Welcome / hint** auto-dismiss timers.

### 6.2 Force-mode adaptations

- **Node rendering**: custom `nodeCanvasObject` draws the mockup pill (bg surface, border, 999 radius), type mark (person accent circle w/ initial; family pill w/ name; landmark success rounded square; toponym outlined diamond; event warn dot; path outlined pill), label 13px 600 + sub 11px muted. Selection ring / lit ring / flash ring painted in the same painter; auto-clear via timers.
- **Edges**: canvas links colored by kind — social `--fg` 45%, geo `--success` 55%, hist `--warn` 55%; suggested dashed accent + lower opacity. Visibility follows layers toggles.
- **Pan/zoom**: force-graph built-ins; wheel zoom clamped ~0.25–2.6; zoom buttons + fit via `graphRef.zoom()` / `zoomToFit()`.
- **Readout**: `StageUi` shows zoom % + live node count (e.g., `18 nodes · 1.00×`) — pan offset dropped (no world coords in force mode). Zoom % synced from `graphRef.current.zoom()`.
- **Node drag**: force-graph built-in drag (node follows cursor, links follow, position sticks).
- **New node placement**: graph bounding-box center (via `getGraphBbox()`), then selects the new node.
- **Grid**: criss-cross 16/80px pattern as fixed background layer (per decision 10).
- **Clusters**: dropped.

### 6.3 Global toast (bottom-right)

`Toast.tsx` renders a discreet auto-hiding pill at **bottom-right** (mockup pill styling: dark bg, radius pill, 13px; ~2.5s duration), driven by `uiSlice.toast`. Used for: validation errors (empty node name, invalid relation target), mutation confirmations (save/report/relation added/queue updates), search multi-match counts. `showToast(message, 'error')` renders with a danger tint when relevant.

### 6.4 Error handling

No backend, so error handling is UI-level: required-field validation in modals and the relation form (inline + toast), chat fallback answers, and the error-tone toast for anything that fails. No crash paths expected; force-graph renders empty-graph state gracefully.

## 7. Verification (Section 5)

No test framework exists. Acceptance:

1. `npm run build` — passes `tsc` typecheck (strict).
2. `npm run lint` — clean ESLint.
3. Manual browser pass on `npm run dev` (localhost:3000) with Supabase env vars absent (proxy skips auth in dev):
   - Landing re-themed; `/auth/login` + `/auth/sign-up` styled with new tokens.
   - `/protected` renders graph app: pill nodes, simulation settles, criss-cross grid behind.
   - Select p-nikolas → document panel (bio w/ blockquote, facts, audio/wikipedia embeds); relations tab lists connected edges; tabs switch.
   - Drag a node; pan; zoom in/out/fit; readout updates.
   - Search "mill" → flash, single match opens document; search "a" (multi) → count toast.
   - Chat "the mill" → mill answer + path highlight (nodes + edges lit), clears ~6s; "kalyvia" and "church" answers; fallback for gibberish.
   - Review queue: 3 seeded items; filter; approve/reject syncs bell badge; empty state shows.
   - New node modal: empty name → error toast; valid → node appears + review item queued. Add relation: invalid target → error toast; valid → pending edge + review item.
   - Save/Report toasts at bottom-right; error toasts also bottom-right.
   - Layers toggles + AI-suggestions switch hide/show edges; welcome card and hint chip appear/dismiss on time.
   - Sidepanel open + chat open → chat shifts left; collapse works; ⌘K search; Escape closes popovers/panel.

## 8. Non-goals

- No backend/database wiring (mock data only).
- No dark mode (light-only tokens, dark-ready structure).
- No TipTap, no @tanstack/react-query, no real OCR, no real GraphRAG (all future phases).
- No spatial/geographic semantics (force mode replaces coordinates).
- No test framework setup.
