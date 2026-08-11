# AGENTS.md

## What this repo is

Next.js (App Router) + Supabase starter repurposed for **VillageRoots**: an infinite 2D spatial knowledge graph of village heritage. **No feature code has landed yet** — the codebase is the stock `with-supabase` scaffold (auth flow + placeholder landing/protected pages). Only design/planning docs exist for the product itself.

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

## Auth guard gotcha

The session/auth guard lives in **`proxy.ts` at the repo root** (NOT `middleware.ts`), calling `updateSession` in `lib/supabase/proxy.ts`. It redirects unauthenticated users to `/auth/login` unless the path is `/`, `/login`, or `/auth*`. **When adding protected routes, whitelist them in `proxy.ts`** or users will be silently redirected.

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
- There is no test runner installed yet — the plan must specify one (Vitest for pure logic is the default) and add its setup as the first task.
- Verification gates before pushing: tests green, `npm run build` (tsc typecheck) green, `npm run lint` green.

### 6. PR & close the Linear issue

- Push the branch, then open a PR with `gh pr create`:
  - Title: `PTDN-XX: <short summary>` (so Linear links the PR to the issue).
  - Body: **Overview** (what & why) + **Technical details** (files changed, approach, how verified) + a closing line `Closes PTDN-XX`.
- The Linear GitHub integration links the PR and auto-closes the issue on merge; confirm the issue transitioned to Done afterward.
- Merge after review — the user reviews and merges.
