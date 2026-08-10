# VillageRoots

An **infinite 2D spatial knowledge graph of village heritage** — replace static archives and rigid maps with a boundless, physics-driven workspace where familial, historical, and geographical connections come alive.

Navigate the village's micro-geography and social fabric, build Notion-like documents for every node, embed external context (Maps/Wikipedia), and ultimately use AI to digitize handwritten archives and chat with the collective memory (GraphRAG).

## Status

**Early scaffolding.** The codebase is the stock Next.js (App Router) + Supabase `with-supabase` starter (auth flow + placeholder pages). No product feature code has landed yet; design and planning docs are complete.

## Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript (strict), Tailwind v3 + shadcn/ui
- **Backend / DB:** Supabase (Auth, PostgreSQL + pgvector, Storage, Edge Functions)
- **Planned but uninstalled:** `react-force-graph`, `TipTap`, `Zustand`, `@tanstack/react-query`

> The authoritative architecture lives in [Technical Analysis & Architecture Desi.md](./Technical%20Analysis%20%26%20Architecture%20Desi.md). It supersedes PRD §9 (which still references a FastAPI/Neo4j stack). Product vision and roadmap: [PRD.md](./PRD.md).

## Getting started

1. Clone and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase project credentials (URL + publishable key; the legacy anon key value is accepted):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```

   Without these set, the dev server skips the auth check so you can work without a Supabase project.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command            | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Dev server on localhost:3000                        |
| `npm run build`    | Production build (runs `tsc` typecheck — the typecheck step) |
| `npm run lint`     | ESLint (flat config)                                |
| `npm run start`    | Serve the production build                          |

There is no test framework or test script yet.

## Project docs

- `PRD.md` — product vision, ontology (nodes/edges), and 4-phase rollout.
- `Technical Analysis & Architecture Desi.md` — authoritative architecture: graph-in-PostgreSQL schema, RLS/GDPR, phase-by-phase implementation.
- `design/mockup.html` — interactive UI prototype; source of truth for the UI scaffold.
- `docs/superpowers/` — UI scaffold design spec + implementation plan (local-only, gitignored).

## Issue tracker

VillageRoots is tracked on [Linear — Village Roots](https://linear.app/yiayiaai/project/village-roots-41596ea1772e) (team `Potidaneia`, keys `PTDN-*`).

## Roadmap

1. **Phase 1** — Infinite canvas, manual node/edge creation, Notion-like sidepanel editor, moderation queue.
2. **Phase 2** — Inline embedding engine (Google Maps / Wikipedia widgets).
3. **Phase 3** — OCR/AI-assisted document scanner for handwritten archives.
4. **Phase 4** — GraphRAG chat + AI linkage prediction.
