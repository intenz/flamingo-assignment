# AI usage

Required write-up for the Flamingo assignment.

## Where AI was used

- **Scaffold** — Next.js 16, Node 24, Prisma 7, seed (~10k), Vitest.
- **Shell** — signed cookie picker, queue UI, claim/resolve/release routes.
- **Domain (R1–R5)** — atomic claim, workspace ACL, notify outbox, keyset list, stale-claim sweep.
- **Docs** — PLAN, ARCHITECTURE, DECISIONS, README, `docs/r1`…`r5`.

AI drafted essentially the full assignment surface. Delivery was **fast but chaotic**: flat folders, opaque names (`StatusPill`, `run`, `expire…`), mixed server/client imports, and weak defaults around App Router caching / refresh. We had to **re-read the tree by hand** and tighten behaviour — not rewrite the domain from scratch.

## What we fixed after AI (manual pass)

| Area | AI left behind | We did |
|------|----------------|--------|
| **File architecture** | Flat `components/`, `lib/triage/*` dump | Domain folders: `components/queue/…`, `hooks/queue/`, `lib/triage/queue/…`, `api/queue/…` |
| **Naming** | UI jargon / vague helpers | Names by job: `QueueItemStatus`, `reopenStaleClaims`, `deliverNotifyOutbox`, `listQueue` |
| **Shared types / constants** | Scattered literals + duplicate status unions | `queue-types.ts` + `queue-constants.ts` (Prisma-free for client) |
| **Next.js caching / RSC** | Urge to `router.refresh()` after every claim; risk of pulling Prisma into client | RSC first page (`loadInitialQueueForSession`); row actions **patch locally**; refresh only on user switch; no DB modules in client islands |

Standing defaults: [`DECISIONS.md`](DECISIONS.md) §0–§1 · [`.cursor/rules/architecture-defaults.mdc`](.cursor/rules/architecture-defaults.mdc).

## Two disagreements (product)

### 1. Resolved items and who did the work

**AI suggested:** drop / clear resolved rows from the useful queue view (and clear the holder on resolve), so the list stayed “active only.”

**We did instead:** keep resolved in the newest-first queue and leave `claimedById` on the row as **who resolved**, so Holder still names the person.

**Why:** hiding resolved lied about history; clearing the holder made it impossible to see who finished the item.

**Where:** [`src/lib/triage/queue/actions/resolve.ts`](src/lib/triage/queue/actions/resolve.ts) · [`src/lib/triage/queue/format-queue-item.ts`](src/lib/triage/queue/format-queue-item.ts)

### 2. Pagination: pages vs Load more

**AI suggested:** classic page numbers (page 1 / 2 / 3) over the queue.

**We did instead:** keyset list + a **Load more** button that appends the next older page.

**Why:** numbered pages break when the queue moves under you (duplicates / skips). Load more + `after=<id>` stays stable on ~10k rows.

**Where:** [`src/lib/triage/queue/queue.ts`](src/lib/triage/queue/queue.ts) · [`src/hooks/queue/useQueueLoadMore.ts`](src/hooks/queue/useQueueLoadMore.ts) · [`docs/r4-pagination.md`](docs/r4-pagination.md)

## How we verified output

| Check | What we ran |
|-------|-------------|
| Domain suite | `npm test` |
| R1 HTTP race | `npm run test:r1` with `npm run dev` |
| Per-req slices | `npx vitest run tests/domain/claim.test.ts` (and `r2-seal`, `outbox`, `r4-keyset`, `r5-stale`) |
| R4 EXPLAIN | OFFSET vs keyset on 10k rows → [`docs/r4-pagination.md`](docs/r4-pagination.md) |
| Manual UI | claim race, Dave viewer, Resolve/notify notice, Load more |
| Architecture pass | Full file review + rename/move; `tsc`; smoke queue claim/resolve/notify UI |
