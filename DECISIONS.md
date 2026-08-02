# Decisions

Four scored choices. Each: **context** / **chose** / **costs**.

---

## 1. Concurrent claim on the backend (conditional UPDATE)

**Context:** Two people can Claim the same open item at once; the UI alone cannot pick a winner.

**Chose:** One atomic backend `UPDATE … WHERE status='open'` (plus membership). Exactly one winner; loser gets `already_claimed` + holder. Code: [`claim.ts`](src/lib/triage/queue/actions/claim.ts) · [`docs/r1-claim-once.md`](docs/r1-claim-once.md).

**Costs:** Other open tabs still need a click/refresh to see the new holder.

---

## 2. Notify delivery via a second Resolve click

**Context:** `notify()` is flaky on purpose; resolve must not wait on it, and failures must stay visible.

**Chose:** Durable outbox on resolve; first drain after the response; if it fails, user clicks **Resolve** again to retry. Code: [`resolve.ts`](src/lib/triage/queue/actions/resolve.ts) · [`docs/r3-resolving-notifies.md`](docs/r3-resolving-notifies.md).

**Costs:** Users are pulled back to retry delivery instead of only triage work.

---

## 3. Domain folders and clear names

**Context:** Flat dumps and vague names (`StatusPill`, `run`, `expire…`) made the tree hard to own.

**Chose:** Group by domain (`components/queue/`, `hooks/queue/`, `lib/triage/queue/…`, `api/queue/…`) and name by job (`reopenStaleClaims`, `useQueueActions`, `listQueue`).

**Costs:** Longer paths; every new file must land in the right folder.

---

## 4. Docs that explain the product

**Context:** Reviewers (and future us) need to run and understand R1–R5 without reverse-engineering the repo.

**Chose:** Slim README + per-req notes (`docs/r1`…`r5`) + this file and `AI_USAGE.md`.

**Costs:** Docs drift unless updated when behaviour changes.

---

## Deliberately not done

1. **Live claim sync** — no WebSockets / reactive DB; the other user does not see a new holder until they act or refresh.
2. **Server-side notify retry + ops logs** — no worker with backoff or failure dashboards; retry is still a second Resolve click.
3. **Storybook / shared UI kit** — no visual component library yet; only markdown docs for how the product works.

---

## Day-one refactor

I'd start improving the project by extracting **shared UI components** for the team, adding **list virtualization** (windowing) on the queue table, splitting the fat hooks [`useQueueActions.ts`](src/hooks/queue/useQueueActions.ts) / [`useQueueNotifyOutbox.ts`](src/hooks/queue/useQueueNotifyOutbox.ts) into small helpers, plus **SEO** (metadata / Open Graph) and broader **performance** work (caching, bundle size, Core Web Vitals).
