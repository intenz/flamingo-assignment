# Decisions

Four scored choices. Each: **context** / **chose** / **rejected** / **costs** / **wrong later**.

---

## 1. Concurrent claim on the backend (conditional UPDATE)

**Context:** Two people can Claim the same open item at once; the UI alone cannot pick a winner.

**Chose:** One atomic backend `UPDATE … WHERE status='open'` (plus membership). Exactly one winner; loser gets `already_claimed` + holder. Code: [`claim.ts`](src/lib/triage/queue/actions/claim.ts) · [`docs/r1-claim-once.md`](docs/r1-claim-once.md).

**Rejected:** Read-then-write in the app, or “first click wins” only in the browser.

**Costs:** Other open tabs still need a click/refresh to see the new holder.

**Wrong later:** Need WebSockets / reactive sync so the other user sees the holder without acting.

---

## 2. Notify = best-effort-with-a-record

**Context:** `notify()` is flaky on purpose; resolve must not wait on it, and failures must stay visible.

**Chose:** Durable outbox on resolve; drain via `after()` + UI; failed rows retry on a second Resolve click. Named guarantee: **best-effort-with-a-record** (bounded attempts, then `failed` stays visible). Code: [`resolve.ts`](src/lib/triage/queue/actions/resolve.ts) · [`docs/r3-resolving-notifies.md`](docs/r3-resolving-notifies.md).

**Rejected:** Await notify in-request; fire-and-forget with no DB row; unbounded “at-least-once forever” (no worker on free serverless).

**Costs:** Users may click Resolve again to retry delivery.

**Wrong later:** Server-side retries + logs/metrics so people are not the retry loop.

---

## 3. Domain folders and clear names

**Context:** Flat dumps and vague names (`StatusPill`, `run`, `expire…`) made the tree hard to own.

**Chose:** Group by domain (`components/queue/`, `hooks/queue/`, `lib/triage/queue/…`, `api/queue/…`) and name by job (`reopenStaleClaims`, `useQueueActions`, `listQueue`).

**Rejected:** One flat `components/` + opaque helpers; Prisma in client islands.

**Costs:** Longer paths; every new file must land in the right folder.

**Wrong later:** With more people, split claim vs notify into separate deployables behind the same UI.

---

## 4. Docs that explain the product

**Context:** Reviewers (and future us) need to run and understand R1–R5 without reverse-engineering the repo.

**Chose:** Slim README + per-req notes (`docs/r1`…`r5`) + this file and `AI_USAGE.md`.

**Rejected:** Logic only in chat history / giant README walls.

**Costs:** Docs drift unless updated when behaviour changes.

**Wrong later:** With ~10 developers, Storybook + shared UI kit so everyone shares the same components.

---

## Deliberately not done

1. **Live claim sync** — no WebSockets / reactive DB; the other user does not see a new holder until they act or refresh.
2. **Server-side notify retry + ops logs** — no worker with backoff or failure dashboards; retry is still a second Resolve click.
3. **Storybook / shared UI kit** — no visual component library yet; only markdown docs for how the product works.

---

## Day-one refactor

I'd start improving the project by extracting **shared UI components** for the team, adding **list virtualization** (windowing) on the queue table, splitting the fat hooks [`useQueueActions.ts`](src/hooks/queue/useQueueActions.ts) / [`useQueueNotifyOutbox.ts`](src/hooks/queue/useQueueNotifyOutbox.ts) into small helpers, plus **SEO** (metadata / Open Graph) and broader **performance** work (caching, bundle size, Core Web Vitals).
