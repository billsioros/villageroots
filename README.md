# VillageRoots

An **infinite 2D spatial knowledge graph of village heritage** — replace static archives and rigid maps with a boundless, physics-driven workspace where familial, historical, and geographical connections come alive.

Navigate the village's micro-geography and social fabric, build Notion-like documents for every node, embed external context (Maps/Wikipedia), and ultimately use AI to digitize handwritten archives and chat with the collective memory (GraphRAG).

## Status

- **Infinite spatial canvas** — a boundless 2D workspace with multiscale zoom & pan. The physics engine clusters related nodes into families and lineages at the macro level, dissolving into individual nodes at the micro level. Users drag nodes and map connections by dragging a link from one node to another.
- **Notion-like node editor** — double-clicking a node opens a full-height sidepanel. Nodes are rich documents: markdown formatting, bullet points, and rich text, auto-saved to the graph.
- **Inline external embeds** — paste a Google Maps or Wikipedia URL into a node document and it becomes an interactive inline widget.
- **Crowdsourced & AI-assisted entry** — create nodes and edges manually, or upload photos of handwritten archives (church registries, property deeds, census notebooks) for OCR + LLM extraction that pre-fills the graph forms for review.
- **Graph intelligence** — GraphRAG chat answers natural-language questions by traversing the graph and highlighting the answer path on the canvas; machine-learning linkage prediction suggests unmapped relationships as dashed, glowing edges for verification.
- **Privacy & moderation** — living individuals are private by default (GDPR); deceased individuals are public historical records. All submissions enter a moderation queue (`pending` → `approved`/`rejected`) that village administrators gate before publishing.

## Product ontology

The system is a semantic network of **nodes** (entities) and **edges** (relationships), stored as a graph in PostgreSQL.

**Node types**

| Type | Description | Key properties |
| --- | --- | --- |
| Person | Individuals (living or deceased) | name, birthYear, deathYear, audioStoryUrl |
| Family | Grouping nodes for specific lineages | name, origin |
| Toponym | Micro-local place names (*τοπωνύμια*) | name, description |
| Landmark | Churches, sights, ruins, bridges | name, type, buildYear |
| Path / Road | Routes connecting places | name, surfaceType |
| Event | Temporal occurrences acting as hubs | title, date, description |

**Edge types**

- **Social:** `CHILD_OF`, `MARRIED_TO`, `SIBLING_OF`, `BELONGS_TO_CLAN`
- **Geographic:** `OWNS_LAND_AT`, `LIVED_AT`, `FARMED_AT`
- **Historical:** `BAPTIZED_AT`, `BURIED_AT`, `BUILT_BY`, `PARTICIPATED_IN`

## Tech stack

**Installed:**

- **Frontend:** Next.js (App Router), React 19, TypeScript (strict), Tailwind v3 + shadcn/ui
- **Backend / DB:** Supabase (Auth, PostgreSQL)

**Planned but uninstalled** (per the architecture doc):

- `react-force-graph` — WebGL/Canvas rendering for the infinite canvas
- `TipTap` — headless rich-text editor for the Notion-like sidepanel
- `Zustand` — complex canvas state
- `@tanstack/react-query` — server state caching
- `pgvector` — embeddings for GraphRAG (Phase 4)

> The authoritative architecture lives in [docs/Technical Analysis & Architecture Desi.md](./docs/Technical%20Analysis%20%26%20Architecture%20Desi.md). It supersedes PRD §9 (which still references a FastAPI/Neo4j stack). Product vision and roadmap: [docs/PRD.md](./docs/PRD.md).

## Status

**Scaffold phase.** The codebase is the `with-supabase` starter (auth flow + graph app at root). The UI scaffold design is approved (local `docs/superpowers/` spec) and tracked on Linear (PTDN-19).

## Getting started

**Prerequisites:** Node.js 18.17+ and npm.

1. Clone and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase project credentials (URL + publishable key; the legacy anon key value is accepted):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```

   Find these in your Supabase project under **Project Settings > API**. Without them, the dev server skips the auth check so you can work without a Supabase project.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

4. For a production build:

   ```bash
   npm run build
   npm run start
   ```

## Commands

| Command            | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Dev server on localhost:3000                        |
| `npm run build`    | Production build (runs `tsc` typecheck — the typecheck step) |
| `npm run start`    | Serve the production build                          |
| `npm run lint`     | ESLint (flat config)                                |

There is no test framework or test script yet.

## Project docs

- `docs/PRD.md` — product vision, ontology (nodes/edges), and 4-phase rollout.
- `docs/Technical Analysis & Architecture Desi.md` — authoritative architecture: graph-in-PostgreSQL schema, RLS/GDPR, phase-by-phase implementation.
- `design/mockup.html` — interactive UI prototype; source of truth for the UI scaffold.
- `docs/superpowers/` — UI scaffold design spec + implementation plan (local-only, gitignored).

## Issue tracker

VillageRoots is tracked on [Linear — Village Roots](https://linear.app/yiayiaai/project/village-roots-41596ea1772e) (team `Potidaneia`, keys `PTDN-*`).

## Roadmap

1. **Phase 1** — Infinite canvas, manual node/edge creation, Notion-like sidepanel editor, moderation queue.
2. **Phase 2** — Inline embedding engine (Google Maps / Wikipedia widgets).
3. **Phase 3** — OCR/AI-assisted document scanner for handwritten archives.
4. **Phase 4** — GraphRAG chat + AI linkage prediction.
