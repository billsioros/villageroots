# AGENTS.md

## What this repo is

Next.js (App Router) + Supabase starter repurposed for **VillageRoots**: an infinite 2D spatial knowledge graph of village heritage. The product itself is **not implemented yet** — the codebase is the stock `with-supabase` scaffold (auth flow + landing page) plus design docs.

- `PRD.md` — product vision and phased roadmap.
- `Technical Analysis & Architecture Desi.md` — the **authoritative** architecture. It supersedes PRD §9: stack is Next.js + Supabase (PostgreSQL + pgvector), NOT the FastAPI/Neo4j still mentioned in the PRD. Planned-but-uninstalled libs: `react-force-graph`, `TipTap`, `Zustand`, `@tanstack/react-query`.
- Both docs are currently untracked in git; keep them in sync when implementing.

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
- Data model target (from the architecture doc): single polymorphic `nodes` table + `edges` table with JSONB, `status` ('pending'/'approved'/'rejected') moderation, RLS for GDPR privacy (living vs deceased).
