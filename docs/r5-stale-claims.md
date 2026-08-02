# R5 — Stale claims

## Rule

An active claim older than **30 minutes** (`CLAIM_TTL_MS`) returns to `open` with `claimedById` / `claimedAt` cleared.

## Who runs the sweep (no Vercel daemon)

There is no always-on worker. Sweep is **opportunistic + optional HTTP**:

| Runner | When |
|--------|------|
| `listQueue` | Every queue page load (workspace-scoped) |
| `claimItem` | Before the atomic claim — expires that row so a stale holder cannot block |
| `POST /api/queue/queue-reopen-claim` | Manual / external cron (session required; scoped to the user’s workspace) |

Guarantee: **eventually** expired under traffic, not wall-clock exact without a scheduler hitting `/api/queue/queue-reopen-claim`.

## Resolve after expiry

If the holder resolves after the claim is past TTL:

1. Domain expires the row (`open`) if needed.
2. Resolve fails with `409 invalid_state` and `Claim expired; item returned to the open queue.`
3. UI sets the row to open and shows a warning notice (no silent success).

Release follows the same expiry-first rule.

Fresh resolves still use a conditional `UPDATE … claimedAt >= cutoff` inside the outbox transaction so a claim that ages out mid-request cannot resolve.

## UI truth (display only)

The pill can show **`claimed · stale`** when `claimedAt` is older than 30m (`claimLooksStale`). That is a **hint** — the client does **not** flip the row to `open`. The server still owns expiry (list/claim/sweep/resolve).

## Verify

```bash
npx vitest run tests/domain/r5-stale.test.ts
```

Status returns to `open` after refresh or the next claim/resolve/release (or when sweep runs).
