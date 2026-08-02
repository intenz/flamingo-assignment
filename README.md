# flamingo-assignment

Concurrent triage queue for the Flamingo Full-Stack home assignment (**R1–R5**).

Spec: [`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md) · Design: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Plan: [`PLAN.md`](PLAN.md) · Decisions: [`DECISIONS.md`](DECISIONS.md) · AI: [`AI_USAGE.md`](AI_USAGE.md)

## Stack

| Piece | Choice |
|-------|--------|
| Runtime | Node **24** (`.nvmrc`; Next 16 also needs ≥20.9) |
| App | Next.js **16** App Router, TypeScript, Tailwind 4 |
| DB | Prisma 7 → Postgres (`prisma dev` locally; Supabase URI for deploy) |
| Auth | Seeded-user picker + HMAC-signed cookie (no OAuth) |
| Deploy | Vercel (serverless) |

## Run locally

```bash
nvm use
cp .env.example .env          # set SESSION_SECRET; sync DATABASE_URL port after db:up
npm install
npm run db:up                 # prints postgres://… — update .env if port differs
npm run db:generate
npm run db:push               # or: npm run db:migrate
npm run db:seed               # ~10k items + Alice/Bob/Carol/Dave
npm run dev                   # http://localhost:3000
```

Stop DB: `npm run db:down`. Re-seed wipes domain tables then recreates fixtures.

### Seeded users (`ws_flamingo`)

| id | name | role |
|----|------|------|
| `usr_alice` | Alice Owner | owner |
| `usr_bob` | Bob Member | member |
| `usr_carol` | Carol Member | member |
| `usr_dave` | Dave Viewer | viewer |

~10 000 items: ~82% open / ~12% claimed / ~6% resolved (statuses mixed across time).

## Verify

All domain tests:

```bash
npm test          # 29 tests
```

### R1 — Claim once

Exactly one winner under parallel claim. Lost race → HTTP 200 + `already_claimed` (not an error).

```bash
# terminal A
npm run db:up && npm run dev

# terminal B (same .env)
npm run test:r1
# Domain only:
npx vitest run tests/domain/claim.test.ts
```

### R2 — Sealed workspaces

ACL in domain (`src/lib/triage/access.ts`, claim `UPDATE … JOIN Membership`). Foreign IDs and viewer mutations → `403`. UI hides buttons for Dave; curl still sealed.

```bash
npx vitest run tests/domain/r2-seal.test.ts
# Manual: pick usr_dave — queue visible, no Claim/Resolve/Release
```

### R3 — Resolving notifies

Resolve returns immediately; flaky `notify()` drains via durable `NotifyOutbox` (`after()` + `/api/outbox/drain`). Guarantee: **at-least-once**. UI polls status; failed → click Resolve to retry.

```bash
npx vitest run tests/domain/outbox.test.ts
```

### R4 — Stable pagination

Keyset via `after=<lastItemId>` (not OFFSET). Failure mode + EXPLAIN ANALYZE: [`docs/r4-pagination.md`](docs/r4-pagination.md).

```bash
npx vitest run tests/domain/r4-keyset.test.ts
```

### R5 — Stale claims

Claims older than **30 minutes** return to `open`. Sweep on list/claim (+ optional `POST /api/claims/sweep`). Resolve after expiry → `409` + open. Details: [`docs/r5-stale-claims.md`](docs/r5-stale-claims.md).

```bash
npx vitest run tests/domain/r5-stale.test.ts
```

UI updates after refresh or the next claim/resolve/release (no client-side expiry clock).

## Status

R1–R5 implemented. Docs finalize + Vercel deploy next.
