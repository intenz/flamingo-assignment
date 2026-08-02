# Decisions

Four scored choices for the Flamingo assignment. Each: **context** / **chose** / **rejected** / **costs** / **wrong later**. Code links point at the real implementation.

---

## 1. Lost claim is an outcome, not an error (R1)

**Context:** Two people can claim the same open item at once. Treating the loser as a hard error makes the UI feel broken.

**Chose:** One conditional SQL update — only `open` rows flip to `claimed`, and only for owner/member. The winner gets `outcome: "won"`. The loser gets HTTP **200** + `already_claimed` + holder, so the row can update without a full refresh.

**Code:** [`src/lib/triage/claim.ts`](src/lib/triage/claim.ts) · [`src/app/api/items/[id]/claim/route.ts`](src/app/api/items/[id]/claim/route.ts) · UI reconcile in [`src/hooks/useItemActions.ts`](src/hooks/useItemActions.ts)

**Rejected:** HTTP 409 / thrown error on every loss — fine for strict REST, wrong for a calm triage tool.

**Costs:** Clients must read `outcome`, not only status codes.

**Wrong later:** Metrics that count every 200 as “success” will lie; you’ll want a dedicated lost-claim counter.

---

## 2. Workspace ACL lives in domain, not the UI (R2)

**Context:** Someone pasting an item id into curl must not read or mutate across workspaces. Viewers must not claim/resolve/release even if they forge a request.

**Chose:** Checks in domain — `assertItemAccess` for resolve/release; claim seals ACL inside the same `UPDATE … JOIN memberships`. Foreign workspace → **403**. UI only hides buttons for viewers.

**Code:** [`src/lib/triage/access.ts`](src/lib/triage/access.ts) · [`src/lib/auth/membership.ts`](src/lib/auth/membership.ts) · claim JOIN in [`src/lib/triage/claim.ts`](src/lib/triage/claim.ts)

**Rejected:** Route-only guards (easy to forget on the next endpoint) and “hide buttons = secure”.

**Costs:** Every new item mutation must call the same helpers (or join memberships).

**Wrong later:** Multi-workspace UIs need richer membership caching; the seal must stay server-side.

---

## 3. Resolve returns immediately; notify is a durable outbox (R3)

**Context:** `notify()` sleeps ~1s and fails ~1/5. Resolve must not wait on it. On Vercel nothing keeps running after the response unless you recorded work first.

**Chose:** Same DB transaction: mark resolved + insert `NotifyOutbox` (`pending`). Drain once via `after()`, UI polls, retry only on a second Resolve click. Named guarantee: **at-least-once**.

**Code:** [`src/lib/triage/resolve.ts`](src/lib/triage/resolve.ts) · [`src/lib/triage/outbox.ts`](src/lib/triage/outbox.ts) · [`src/lib/triage/notify.ts`](src/lib/triage/notify.ts) · [`src/hooks/useNotifyOutbox.ts`](src/hooks/useNotifyOutbox.ts)

**Rejected:** Await notify in the request; fire-and-forget with no DB row; automatic browser retry loops that re-hit the flaky helper.

**Costs:** HTTP 200 on resolve means “outbox written”, not “notify delivered”.

**Wrong later:** High traffic needs a real worker queue with backoff, not Resolve-click retries.

---

## 4. Queue pages with keyset `after=<id>`, not OFFSET (R4)

**Context:** The queue moves while someone loads more. OFFSET shifts under head inserts; deep pages get expensive on ~10k rows.

**Chose:** Keyset on `(createdAt, id)` with `after=<lastItemId>` (server resolves the sort key) + Load more. See EXPLAIN in [`docs/r4-pagination.md`](docs/r4-pagination.md).

**Code:** [`src/lib/triage/list-items.ts`](src/lib/triage/list-items.ts) · [`src/hooks/useQueueLoadMore.ts`](src/hooks/useQueueLoadMore.ts) · [`src/app/api/queue/route.ts`](src/app/api/queue/route.ts)

**Rejected:** OFFSET/LIMIT (duplicates under churn) and fetching the whole workspace queue.

**Costs:** Brand-new head inserts stay invisible until refresh; a deleted `after` anchor returns 404.

**Wrong later:** Heavy filters need matching composite indexes.

---

## R5 (extra — not one of the four scored slots)

Claims older than 30 minutes return to `open`. No daemon: sweep on list + claim, plus optional `POST /api/claims/sweep`. Resolve after expiry fails with `invalid_state` and the row is open again.

**Code:** [`src/lib/triage/stale-claims.ts`](src/lib/triage/stale-claims.ts) · [`src/lib/triage/require-holder.ts`](src/lib/triage/require-holder.ts) · [`docs/r5-stale-claims.md`](docs/r5-stale-claims.md)

---

## Deliberately not done

1. **Live claim-expiry UI** — no client timer; stale rows flip on the next list/claim/resolve (or F5).
2. **Vercel Cron for sweep** — only opportunistic sweep + optional HTTP endpoint.
3. **Notify worker queue** — drain is `after()` + Resolve-click retry, not a separate queue.

---

## Day-one refactor

Add a scheduled sweep (Vercel Cron → `/api/claims/sweep`) and a real outbox worker so expiry and notify do not depend on page traffic or a second Resolve click.

---

## Assumptions (gaps we closed)

| Topic | Choice |
|-------|--------|
| Scope | All five requirements (R1–R5), depth on R1–R3 first |
| Runtime | Node 24 locally; Next 16 needs ≥20.9 for reviewers |
| Auth | Signed cookie user picker — no OAuth ([`src/lib/auth/`](src/lib/auth/)) |
| DB | Prisma 7 + Postgres; prod shares flamingo-triage Supabase tables |
| Seed | ~10k items, ~82/12/6 open/claimed/resolved on `ws_flamingo` |
| Lost claim HTTP | 200 + `already_claimed` (Decision 1) |
| Notify guarantee | **at-least-once** (Decision 3) |
| Stale TTL | 30 minutes — [`src/lib/triage/claim-constants.ts`](src/lib/triage/claim-constants.ts) |
