# flamingo-assignment

Concurrent triage queue for the Flamingo Full-Stack home assignment (**R1–R5**).

Spec: [`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md) · Design: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Plan: [`PLAN.md`](PLAN.md) · Decisions: [`DECISIONS.md`](DECISIONS.md) · AI: [`AI_USAGE.md`](AI_USAGE.md)

## Live URL

**Production:** [https://flamingo-assignment.vercel.app](https://flamingo-assignment.vercel.app)

Shares the **flamingo-triage** Supabase project and tables. Deploy notes: [`docs/deploy.md`](docs/deploy.md).

## Time spent

About **one day** end-to-end (scaffold → R1–R5 → docs → Vercel), plus a manual pass after AI. Rough split:

| Area | ~ |
|------|---|
| Bootstrap + Prisma/seed + auth/UI shell | ~1h |
| **R1** Claim once | ~1.5h |
| **R2** Sealed workspaces | ~1h |
| **R3** Resolving notifies | ~1.5h |
| **R4** Stable pagination | ~1h |
| **R5** Stale claims | ~1h |
| Deliverable docs + deploy | ~1–2h |
| Manual review & file improvements after AI | ~3h |

## Stack

| Piece | Choice |
|-------|--------|
| Runtime | Node **≥20.9** (brief: Node 20; `.nvmrc` may be 24 locally; Next 16 minimum) |
| App | Next.js **16** App Router, TypeScript, Tailwind 4 |
| DB | Prisma 7 → Postgres (`prisma dev` locally; Supabase for deploy) |
| Auth | Seeded-user picker + HMAC-signed cookie |
| Deploy | Vercel |

## Run locally

```bash
nvm use
cp .env.example .env          # SESSION_SECRET; DATABASE_URL after db:up (or Supabase URI)
npm install
npm run db:up                 # skip if using Supabase
npm run db:generate
npm run db:push
npm run db:seed               # ~10k items + Alice/Bob/Carol/Dave
npm run dev                   # http://localhost:3000
```

Stop local DB: `npm run db:down`. Re-seed wipes domain tables then recreates fixtures.

### Seeded users (`ws_flamingo`)

| id | name | role |
|----|------|------|
| `usr_alice` | Alice Owner | owner |
| `usr_bob` | Bob Member | member |
| `usr_carol` | Carol Member | member |
| `usr_dave` | Dave Viewer | viewer |

~10 000 items: ~82% open / ~12% claimed / ~6% resolved.

## Requirements (how we did them)

| Req | Doc | Quick check |
|-----|-----|-------------|
| **R1** Claim once | [`docs/r1-claim-once.md`](docs/r1-claim-once.md) | `npm run test:r1` (dev up) · `npx vitest run tests/domain/claim.test.ts` |
| **R2** Sealed workspaces | [`docs/r2-sealed-workspaces.md`](docs/r2-sealed-workspaces.md) | `npx vitest run tests/domain/r2-seal.test.ts` · curl in that doc |
| **R3** Resolving notifies | [`docs/r3-resolving-notifies.md`](docs/r3-resolving-notifies.md) | `npx vitest run tests/domain/outbox.test.ts` · guarantee: **best-effort-with-a-record** |
| **R4** Stable pagination | [`docs/r4-pagination.md`](docs/r4-pagination.md) | `npx vitest run tests/domain/r4-keyset.test.ts` |
| **R5** Stale claims | [`docs/r5-stale-claims.md`](docs/r5-stale-claims.md) | `npx vitest run tests/domain/r5-stale.test.ts` |

Full suite: `npm test`.

R2 curl (dev up, `SESSION_SECRET` in `.env`) — viewer must get **403**:

```bash
COOKIE=$(npx tsx -e 'import "dotenv/config"; import { encodeSessionCookie } from "./src/lib/auth/cookie.ts"; process.stdout.write(encodeSessionCookie("usr_dave"))')
curl -s -w "\n%{http_code}\n" -X POST \
  -H "Cookie: flamingo_session=$COOKIE" \
  http://localhost:3000/api/queue/queue-actions/itm_00001/claim
```

(Use a real open item id from the UI if needed. More: [`docs/r2-sealed-workspaces.md`](docs/r2-sealed-workspaces.md).)
