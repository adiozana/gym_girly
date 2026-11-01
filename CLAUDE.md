# CLAUDE.md

**`SPEC.md` is the single source of truth** for this project (a Hebrew, mobile-first strength-training tracker). Read the relevant sections before any work. Decisions there are final; if you find a gap or contradiction, pick the simplest option consistent with the spec's principles and report it at the end of the stage.

## Workflow
- Build strictly by the stages in SPEC.md ("שלבי בנייה וקריטריוני קבלה"), one stage at a time.
- Before a stage: write a short plan and wait for approval before writing code.
- End of each stage: run all tests, verify every acceptance criterion, make one commit for the stage, then **stop and wait for approval** before the next stage.
- Data model + logic (with tests) first, UI after.
- Never build anything listed under "מחוץ ל-scope".

## Stack
- Next.js (App Router) + TypeScript strict · Tailwind CSS + shadcn/ui · Heroicons · Recharts · date-fns · Zod
- Supabase (Postgres + Auth) via `@supabase/ssr`; schema as migrations in `supabase/migrations`, built-in exercise library in `supabase/seed.sql`, DB types from `supabase gen types`
- Tests: Vitest (unit), Playwright (one main-flow e2e) · Deploy: Vercel
- Next.js 16 with `cacheComponents` enabled: APIs differ from older versions, so check `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).
- Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the spec's `ANON_KEY` was renamed by the user's decision).

## Commands
`npm run dev` · `npm test` · `npm run test:integration` (needs `supabase start`) · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run db:reset` (local DB from scratch) · `npm run db:test` (pgTAP RLS/seed tests) · `npm run db:types`

## Conventions
- Code, identifiers, table names and code comments in English. All UI text in Hebrew, only in `src/lib/strings.ts`.
- TypeScript strict, no `any`.
- Reads in Server Components; writes via Server Actions, each validated with Zod (schemas in `src/lib/validation/`).
- Auth: `getCurrentUser()` (`src/lib/auth/session.ts`) in every page and action that needs the user; the proxy only redirects. With Cache Components, anything that reads the session goes inside `<Suspense>`.
- Next 16 keeps pages you leave mounted but hidden (React `<Activity>`), with their state. Transient UI state (open sheets/dialogs, "busy" flags) must reset on hide: use `Sheet` / `ConfirmDialog` (they do it) or `useOnHidden()` (`src/lib/use-on-hidden.ts`). An open modal left in a hidden page makes the next page inert.
- Tests that create users run only against local Supabase, never the cloud project.
- Authorization is enforced by Postgres RLS on every table, not only in code. Never expose the `service_role` key to the client.
- Calculations (streak, day status, progress, previous performance, e1RM) are pure functions in `src/lib/calc/` with Vitest tests.
- RTL: `<html lang="he" dir="rtl">`, Tailwind logical properties only (`ms-/me-/ps-/pe-/start/end`). Mobile-first (360–430px), tap targets ≥ 44px.
- Before any UI work, load the user's design skill (`adi-ux-ui`) and `design-system/MASTER.md`, and follow them; SPEC.md defines what screens do, the skill defines how they look.
- Secrets live in `.env.local` (never committed); `.env.example` lists names only.
