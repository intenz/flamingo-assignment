# R3 — Resolving notifies

## Approach

**Resolve returns immediately; notify is durable.** In one transaction: conditional item → `resolved` plus a `NotifyOutbox` row `pending`. The flaky `notify()` helper is **never awaited** on the HTTP path.

Post-response, `after()` schedules `deliverNotifyOutbox(outboxId)`. The UI **polls** `GET /api/queue/queue-outbox/[id]`. On page refresh, if the outbox is still `pending` with `attempts === 0` (e.g. `after()` never ran), the client kicks **one** drain. After a failed attempt, retry is only via a second Resolve click (no automatic retry loop). Optional batch: `POST /api/queue/queue-outbox/drain`.

`notify()` sleeps ~1s and fails ~20% of the time. Drain retries until **delivered** or **`failed` after 8 attempts**.

## Key files

| Path | Role |
|------|------|
| `src/lib/triage/queue/actions/resolve.ts` | Resolve TX + outbox create |
| `src/lib/triage/queue/actions/notify-outbox.ts` | Deliver notify + status |
| `src/lib/triage/queue/actions/notify.ts` | Deliberately flaky external notify |
| `src/app/api/queue/queue-actions/[id]/resolve/route.ts` | Resolve + `after()` |
| `src/app/api/queue/queue-outbox/[id]/route.ts` | GET status / POST retry |
| `tests/domain/outbox.test.ts` | Pending → delivered / retry |

## HTTP outcomes

**POST `/api/queue/queue-actions/[id]/resolve`**

| Case | Status | Notes |
|------|--------|------|
| Success | **200** | `notify: { outboxId, status: "pending" }` — not yet delivered |
| Wrong holder / expired (R5) | **409** | `invalid_state` |
| ACL | **403** | |

**GET `/api/queue/queue-outbox/[id]`** — poll `pending` / `delivered` / `failed`.  
**POST `/api/queue/queue-outbox/[id]`** — re-drain one row.

## Guarantee

**at-least-once** delivery attempts (`DECISIONS.md` §3) — not exactly-once. Downstream must tolerate duplicate notifies.

## Verify

```bash
npx vitest run tests/domain/outbox.test.ts
# Manual: Resolve → “Notify: sending…” → delivered or “Click Resolve to retry”
```

## Limitation

HTTP 200 on resolve means the outbox row was written, **not** that notify delivered. No dedicated worker queue — delivery depends on `after()`, poll, Resolve-click retry, or `/api/queue/queue-outbox/drain`.
