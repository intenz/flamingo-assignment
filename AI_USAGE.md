# AI usage

Required write-up for the Flamingo assignment.

## Where AI was used

- **Scaffold** — Next.js 16, Node 24, Prisma 7, seed (~10k), Vitest.
- **Shell** — signed cookie picker, queue UI, claim/resolve/release routes.
- **Domain (R1–R5)** — atomic claim, workspace ACL, notify outbox, keyset list, stale-claim sweep.
- **Refactor** — split hooks (`useQueueActions` / `useQueueNotifyOutbox` / `useQueueLoadMore`), shared API helpers, holder gate.
- **Docs** — PLAN, ARCHITECTURE, DECISIONS, README, `docs/r1`…`r5`.

## Two disagreements

### 1. Seed statuses looked “all resolved” on page one

**AI suggested:** assign statuses in blocks by index (open → claimed → resolved).

**We did instead:** shuffle a status deck so newest-first pages show a mixed queue.

**Why:** reviewers open the app and see the first 50 rows; a solid block of `resolved` lies about the product.

**Where:** [`prisma/seed.ts`](prisma/seed.ts) (status deck + deterministic shuffle).

### 2. Client-side clock for stale claims

**AI suggested:** poll a snapshot API and/or start a `CLAIM_TTL_MS` timer after Claim so the UI flips open on its own.

**We did instead:** expiry stays **server-only** (list / claim / `POST /api/queue/queue-reopen-claim`). The UI updates on refresh or the next mutation.

**Why:** one source of truth; matches “no daemon on Vercel” without pretending the browser is the clock.

**Where:** [`src/lib/triage/queue/actions/reopen-stale-claims.ts`](src/lib/triage/queue/actions/reopen-stale-claims.ts) · [`docs/r5-stale-claims.md`](docs/r5-stale-claims.md) · no client TTL in [`src/hooks/queue/useQueueActions.ts`](src/hooks/queue/useQueueActions.ts)

## How we verified output

| Check | What we ran |
|-------|-------------|
| Domain suite | `npm test` |
| R1 HTTP race | `npm run test:r1` with `npm run dev` |
| Per-req slices | `npx vitest run tests/domain/claim.test.ts` (and `r2-seal`, `outbox`, `r4-keyset`, `r5-stale`) |
| R4 EXPLAIN | OFFSET vs keyset on 10k rows → [`docs/r4-pagination.md`](docs/r4-pagination.md) |
| Manual UI | claim race, Dave viewer, Resolve/notify notice, Load more |
