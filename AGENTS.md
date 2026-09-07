# AGENTS.md

## What this repo is

Next.js (App Router) + Supabase starter repurposed for **VillageRoots**: an infinite 2D spatial knowledge graph of village heritage. The codebase is the stock `with-supabase` scaffold (auth flow + graph app at root). Only design/planning docs exist for the product itself.

Docs (all committed — keep them in sync when implementing):

- `docs/PRD.md` — product vision and phased roadmap.
- `docs/Technical Analysis & Architecture Desi.md` — the **authoritative** architecture. It supersedes PRD §9: stack is Next.js + Supabase (PostgreSQL + pgvector), NOT the FastAPI/Neo4j still mentioned in the PRD. Planned-but-uninstalled libs: `react-force-graph`, `TipTap`, `Zustand`, `@tanstack/react-query`.
- `design/mockup.html` — interactive UI prototype (Airbnb-derived design system). Source of truth for the UI scaffold.
- `docs/superpowers/` — UI scaffold design spec + implementation plan. **Gitignored, local-only.** The scaffold is approved but NOT implemented — do not mistake the docs for shipped work.

Issue tracker: [Linear — Village Roots](https://linear.app/yiayiaai/project/village-roots-41596ea1772e) (team `Potidaneia`, keys `PTDN-*`). **PTDN-19** tracks the UI scaffold implementation; PTDN-18 tracks the scaffold remainder (react-query + Prettier + docs).

## Commands

- `npm run dev` — dev server on localhost:3000
- `npm run build` — production build (runs `tsc` typecheck; this is the typecheck step)
- `npm run lint` — ESLint (flat config, `next/core-web-vitals` + `next/typescript`)

There is no test framework or test script.

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # accepts legacy anon key value
```

Without these set, `hasEnvVars` in `lib/utils.ts` makes the proxy skip the auth check (dev convenience).

Additional env used by GraphRAG / data tooling:
- `DATABASE_URL` — `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (local Supabase Postgres; used directly by the `postgres` driver in `lib/graph/db.ts`).
- `OPENROUTER_API_KEY` — used for embeddings and chat (see `lib/graph/embeddings.ts`).
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key, used by server-side tooling.

## Supabase database interaction (learned the hard way)

The app talks to Postgres two ways — know which one you need:

- **ORM/Drizzle**: `lib/graph/db.ts` exports `db = drizzle({ client, schema })` over a raw `postgres()` connection from `DATABASE_URL` (`max: 1`). This bypasses RLS entirely (direct connection, not the Supabase HTTP/gateway layer). Use this for data migrations, backfills, and admin/CLI-style scripts. `drizzle/schema.ts` is the single source of truth for table shapes (`nodes`, `edges`, `nodeEmbeddings`, …).
- **Supabase clients**: `lib/supabase/*` go through the anon/publishable key + RLS. Use these for user-scoped reads/writes inside route handlers.

**Talk to the DB without `psql`** — `psql` is NOT on PATH in this environment. Use a one-off node script with the `postgres` driver (reads `DATABASE_URL`), e.g. `node -e "..."` or a temporary `.mjs` file. `DATABASE_URL` always points at the local Supabase instance `postgres:postgres@127.0.0.1:54322/postgres`.

**`supabase` CLI is not on PATH** — it's at `node_modules/.bin/supabase` (v2.116.0). Run it as `./node_modules/.bin/supabase ...`. Local stack: `suapabase start`, `supabase status`; the DB runs in the `supabase_db_villageroots` container on port `54322`.

**Apply a migration to the local DB**: `./node_modules/.bin/supabase db push --local --include-all`. The local DB only picks up migrations when you push them — committing a `supabase/migrations/NNNN_*.sql` file is NOT enough; you must run `db push` (or `db reset`) for the schema to exist locally.

**pgvector constraints (matters for embedding columns)**:
- The vector extension is installed as 0.8.2 in the local Docker build, which **caps HNSW (and ivfflat) index dimensions at 2000**.
- `node_embeddings.embedding` is therefore `vector(1024)` — nemotron-3-embed-1b supports Matryoshka slicing; `embedText()` slices to `EMBEDDING_DIMENSIONS = 1024` so ingestion and query stay consistent. Do NOT raise the dimension above 1024 without first confirming the remote Postgres pgvector build supports larger HNSW indexes.

**GraphRAG embedding lifecycle**:
- `node_embeddings` is populated by `ingestEmbedding()` (`lib/graph/ingest.ts`), auto-triggered on node approval by the moderation route, and manually via `runBackfill()` (`lib/graph/backfill.ts`) / `runRetry()` (`lib/graph/retry-failed.ts`) — also exposed as admin routes `POST /api/admin/embeddings/backfill` and `/retry`.
- If chat returns no results, existing nodes likely have no embeddings yet — run a backfill (see Workflow below for the manual/local approach).

## Auth guard gotcha

The session/auth guard lives in **`proxy.ts` at the repo root** (NOT `middleware.ts`), calling `updateSession` in `lib/supabase/proxy.ts`. It redirects unauthenticated users to `/auth/login` unless the path is `/login` or `/auth*`. **When adding routes to the whitelist, add them in `proxy.ts`** or users will be silently redirected.

Supabase clients (fresh per request, per the Fluid-compute comment):
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — `async createClient()` using `cookies()` (server components / route handlers)
- `lib/supabase/proxy.ts` — request-scoped client for the proxy

## Conventions

- `@/*` path alias → repo root (e.g. `@/lib/utils`, `@/components/ui/button`).
- Styling: Tailwind v3 + shadcn/ui. Add components via `npx shadcn@latest add <name>` — do not hand-write `components/ui/*`.
- TypeScript `strict` mode; ESLint enforced.
- Git: feature work happens on a `ptdn-XX-<slug>` branch off `main`, PR'd and merged after review (see Workflow below). `.worktrees/` and `docs/superpowers/` are gitignored.
- Data model target (from the architecture doc): single polymorphic `nodes` table + `edges` table with JSONB, `status` ('pending'/'approved'/'rejected') moderation, RLS for GDPR privacy (living vs deceased).

## Workflow: Linear issue → branch → PR

Every feature follows: read the Linear issue → design (spec) → plan → TDD → branch + PR that closes the issue.

### 1. Read the issue & gather acceptance criteria

- Pull the issue from Linear (identifier `PTDN-XX`) via the Linear integration: title, description, labels, comments, linked issues.
- Extract the acceptance criteria. If the issue has none, write them out and confirm with the user before proceeding.
- Cross-check the authoritative docs (`docs/PRD.md`, `docs/Technical Analysis & Architecture Desi.md`, `design/mockup.html`) and any existing `docs/superpowers/` spec/plan for the ticket.

### 2. Design (superpowers:brainstorming)

- Invoke the brainstorming skill BEFORE any implementation: explore context → clarifying questions one at a time → 2-3 approaches with trade-offs → present the design in sections, get approval per section.
- Write the design to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, self-review, then user review.
- Hard gate: no implementation until the design is approved.

### 3. Plan (superpowers:writing-plans)

- Invoke writing-plans → `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` with the required header (Goal / Architecture / Tech Stack / REQUIRED SUB-SKILL) and bite-sized tasks, each: failing test → watch it fail → minimal impl → watch it pass → commit.
- Self-review the plan: spec coverage, placeholder scan, type consistency.

### 4. Branch

- Create a branch off `main` named `ptdn-XX-<slug>` (short form of the Linear-generated branch name, e.g. `ptdn-19-ui-scaffold`).
- `docs/superpowers/` is gitignored — the spec/plan stay local-only, never committed; the branch contains only code + tests.

### 5. Implement (TDD — superpowers:test-driven-development)

- Iron law: NO production code without a failing test first. Red → Green → Refactor; commit per task.
- Vitest (v4) is installed and `npm test` runs it; config lives in `vitest.config.ts` (`tests/**/*.test.ts`). Add test files per feature.
- Verification gates before pushing: tests green, `npm run build` (tsc typecheck) green, `npm run lint` green.

### 6. PR & close the Linear issue

- Push the branch, then open a PR with `gh pr create`:
  - Title: conventional type first, then the issue key: `<type>: PTDN-XX <short summary>` (e.g. `feat: PTDN-24 set up CI/CD pipeline`). The repo squash-merges, so the PR title becomes the release commit — it must be conventional or semantic-release produces no version. Linear still links the PR via title/body/branch.
  - Body: **Overview** (what & why) + **Technical details** (files changed, approach, how verified) + a closing line `Closes PTDN-XX`.
- The Linear GitHub integration links the PR and auto-closes the issue on merge; confirm the issue transitioned to Done afterward.
- Merge after review — the user reviews and merges.
