# Implementation plan

Work **one step at a time**. After each step: stop, review, commit (when asked), then continue. Prefer small, readable commits over big dumps.

**Scope: implement all five requirements (R1–R5).** Order still matters: finish R1–R3 solidly before R4–R5.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

**Stack target:** Next.js 16 · Node 24 · TypeScript · Tailwind · Prisma → Supabase Postgres · Vercel

---

## Phase 0 — Bootstrap

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 0.1 | Create dir, git init, move workspace root | `chore: init flamingo-assignment repo` | [x] |
| 0.2 | PLAN, ARCHITECTURE, DECISIONS/AI stubs, ASSIGNMENT | `docs: add plan architecture and assignment text` | [x] |
| 0.3 | Node 24 pin + Next.js 16 App Router scaffold | `chore: scaffold Next.js 16 App Router on Node 24` | [x] |

## Phase 1 — Data layer

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 1.1 | Prisma + env example + DB connection wiring | `chore: add Prisma and Supabase Postgres wiring` | [ ] |
| 1.2 | Schema: Workspace, Membership, User, Item | `feat(schema): model workspaces, roles, and queue items` | [ ] |
| 1.3 | Seed users + ~10k items (realistic status spread) | `chore: seed users and ~10k triage items` | [ ] |
| 1.4 | Vitest + verification script stubs | `test: add Vitest and verification script stubs` | [ ] |

## Phase 2 — Auth + UI + API stubs

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 2.1 | Cookie auth: user dropdown + signed session cookie | `feat(auth): signed-cookie user picker (no OAuth)` | [ ] |
| 2.2 | Queue UI: list items for current workspace | `feat(ui): workspace queue list shell` | [ ] |
| 2.3 | Actions API stubs: claim / resolve / release | `feat(api): claim resolve release endpoints` | [ ] |
| 2.4 | Smoke tests: session cookie + list requires membership | `test: auth and list access smoke tests` | [ ] |

## Phase 3 — R1 Claim once

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 3.1 | Atomic claim in DB (conditional update) | `feat(r1): atomic claim — exactly one winner` | [ ] |
| 3.2 | API returns winner + current holder on loss | `feat(r1): return claim conflict with holder` | [ ] |
| 3.3 | UI reconciles without manual refresh | `feat(r1): reconcile claim race in UI` | [ ] |
| 3.4 | Domain tests: conflict + single holder | `test(r1): claim conflict and single-holder assertions` | [ ] |
| 3.5 | Parallel concurrency script + README how-to | `test(r1): parallel claim concurrency script` | [ ] |

## Phase 4 — R2 Sealed workspaces

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 4.1 | Membership roles: owner / member / viewer | `feat(r2): workspace membership roles` | [ ] |
| 4.2 | Server-side workspace gate on every item route | `feat(r2): seal item routes to workspace membership` | [ ] |
| 4.3 | Viewer cannot claim / resolve / release | `feat(r2): enforce viewer read-only mutations` | [ ] |
| 4.4 | Tests: foreign item denied; viewer 403 | `test(r2): workspace seal and viewer read-only` | [ ] |
| 4.5 | Document check location in README/DECISIONS | `docs(r2): where workspace checks live and why` | [ ] |

## Phase 5 — R3 Resolving notifies

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 5.1 | Flaky `notify()` (~1s sleep, ~1/5 throws) | `feat(r3): flaky notify helper` | [ ] |
| 5.2 | Resolve does not await notify; durable outbox | `feat(r3): async notify with durable delivery record` | [ ] |
| 5.3 | UI: resolve immediate; notify status visible | `feat(r3): truthful resolve + notify status in UI` | [ ] |
| 5.4 | Tests: outbox resolve and drain behavior | `test(r3): outbox resolve and drain behavior` | [ ] |
| 5.5 | Name guarantee honestly in DECISIONS | `docs(r3): state notify delivery guarantee` | [ ] |

## Phase 6 — R4 Stable pagination

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 6.1 | Keyset/cursor list API | `feat(r4): keyset pagination for moving queue` | [ ] |
| 6.2 | Load more UI with cursor | `feat(r4): queue load-more with cursor` | [ ] |
| 6.3 | Tests: no duplicate ids under churn | `test(r4): keyset pages stable under churn` | [ ] |
| 6.4 | EXPLAIN ANALYZE + failure mode note | `docs(r4): explain analyze and pagination failure mode` | [ ] |

## Phase 7 — R5 Stale claims

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 7.1 | Expire claims >30m back to open | `feat(r5): return stale claims to the queue` | [ ] |
| 7.2 | Sweep ownership (no Vercel daemon) | `feat(r5): serverless stale-claim sweep ownership` | [ ] |
| 7.3 | Resolve-after-expiry rejected + UI truth | `feat(r5): reject resolve after claim expiry` | [ ] |
| 7.4 | Tests: stale expiry and resolve-after-expiry | `test(r5): stale expiry and resolve-after-expiry` | [ ] |
| 7.5 | Document sweep + expiry decision | `docs(r5): sweep runner and resolve-after-expiry` | [ ] |

## Phase 8 — Deliverable docs

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 8.1 | README: run, seed, verify R1–R5 | `docs: README run seed and verification` | [ ] |
| 8.2 | Finalize DECISIONS.md | `docs: finalize DECISIONS.md` | [ ] |
| 8.3 | Finalize AI_USAGE.md | `docs: finalize AI_USAGE.md` | [ ] |

## Phase 9 — Ship

| # | Step | Commit message (suggested) | Status |
|---|------|----------------------------|--------|
| 9.1 | Deploy to Vercel | `chore: vercel deploy wiring` | [ ] |
| 9.2 | Live URL + time spent note | `docs: live URL and time calibration` | [ ] |

---

## Working rules

1. **One step → one commit** (or split further if the diff gets large).
2. Do **not** squash history into a single initial commit.
3. Order: **R1 → R2 → R3 → R4 → R5** (all five in scope; depth on R1–R3 first).
4. Update this file’s Status column when a step completes.
5. Fill assumptions into `DECISIONS.md` as they appear. Notable AI disagreements → `AI_USAGE.md`.
6. Never overclaim a guarantee the code does not provide.
7. Before each step: surface decisions for the human to choose when they want; otherwise use documented defaults.
