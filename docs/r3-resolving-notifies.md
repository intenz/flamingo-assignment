# R3 — Resolving notifies

## Approach

**Resolve returns immediately; notify is durable.** In one transaction: conditional item → `resolved` plus a `NotifyOutbox` row `pending`. The flaky `notify()` helper is **never awaited** on the HTTP path.

Post-response, `after()` schedules `drainOutboxEntry(outboxId)`. The UI **polls** `GET /api/outbox/[id]`; on failure the user clicks **Resolve** again to re-drain (no automatic client retry loop). Optional batch: `POST /api/outbox/drain`.

`notify()` sleeps ~1s and fails ~20% of the time. Drain retries until **delivered** or **`failed` after 8 attempts**.

## Key files

| Path | Role |
|------|------|
| `src/lib/triage/resolve.ts` | Resolve TX + outbox create |
| `src/lib/triage/outbox.ts` | Drain + status |
| `src/lib/triage/notify.ts` | Deliberately flaky external notify |
| `src/app/api/items/[id]/resolve/route.ts` | Resolve + `after()` |
| `src/app/api/outbox/[id]/route.ts` | GET status / POST retry |
| `tests/domain/outbox.test.ts` | Pending → delivered / retry |

## HTTP outcomes

**POST `/api/items/[id]/resolve`**

| Case | Status | Notes |
|------|--------|------|
| Success | **200** | `notify: { outboxId, status: "pending" }` — not yet delivered |
| Wrong holder / expired (R5) | **409** | `invalid_state` |
| ACL | **403** | |

**GET `/api/outbox/[id]`** — poll `pending` / `delivered` / `failed`.  
**POST `/api/outbox/[id]`** — re-drain one row.

## Guarantee

**at-least-once** delivery attempts (`DECISIONS.md` §3) — not exactly-once. Downstream must tolerate duplicate notifies.

## Verify

```bash
npx vitest run tests/domain/outbox.test.ts
# Manual: Resolve → “Notify: sending…” → delivered or “Click Resolve to retry”
```

## Limitation

HTTP 200 on resolve means the outbox row was written, **not** that notify delivered. No dedicated worker queue — delivery depends on `after()`, poll, Resolve-click retry, or `/api/outbox/drain`.
