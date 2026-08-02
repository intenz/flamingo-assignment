# AI usage

Required write-up for the Flamingo assignment.

## Where AI was used

- **Scaffold:** Next.js 16 + Node 24, Prisma 7, seed (~10k), Vitest.
- **Auth / triage shell:** HMAC cookie picker; queue list; claim/resolve/release APIs.
- **R1–R5 domain:** atomic claim, workspace ACL, notify outbox, keyset pagination, stale-claim sweep.
- **Visual:** light flamingo.run tokens + mark, DM Sans / Azeret Mono, dense queue table (~80% width).
- **Docs:** PLAN, ARCHITECTURE, DECISIONS, README verify sections, R4/R5 notes with EXPLAIN.

## Disagreements (two places)

For each: what the assistant suggested / what we did instead / why / where.

1. **Seed status vs newest-first** — Assistant first assigned statuses in blocks (open→claimed→resolved by index), so the newest-first first page was all `resolved`. We reshuffled statuses across time so the queue looks realistic. [`prisma/seed.ts`](prisma/seed.ts) (status deck + deterministic shuffle).

2. **Client-driven stale-claim UI** — Assistant added continuous snapshot polling, then a post-Claim `CLAIM_TTL_MS` timer that re-fetched `/api/queue/snapshot`. We removed both: expiry stays **server-only** (list/claim/`POST /api/claims/sweep`); the UI reconciles on refresh or the next mutation. Keeps one source of truth and matches “no daemon on Vercel” without pretending the browser is a clock. See [`docs/r5-stale-claims.md`](docs/r5-stale-claims.md), [`src/lib/triage/stale-claims.ts`](src/lib/triage/stale-claims.ts).

## How output was verified

| Check | Command / method | When |
|-------|------------------|------|
| Full domain suite | `npm test` (29 tests) | through R5 |
| R1 HTTP race | `npm run test:r1` (dev server up) | R1 |
| R2 / R3 / R4 / R5 slices | `npx vitest run tests/domain/{r2-seal,outbox,r4-keyset,r5-stale}.test.ts` | each phase |
| R4 EXPLAIN ANALYZE | deep OFFSET vs keyset on 10k rows | [`docs/r4-pagination.md`](docs/r4-pagination.md) |
| Manual UI | `npm run dev` → claim race, viewer, notify notice, Load more | ongoing |
