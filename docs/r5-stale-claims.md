# R5 — Stale claims

## Rule

An active claim older than **30 minutes** (`CLAIM_TTL_MS`) returns to `open` with `claimedById` / `claimedAt` cleared.

## Who runs the sweep (no Vercel daemon)

There is no always-on worker. Sweep is **opportunistic + optional HTTP**:

| Runner | When |
|--------|------|
| `listItemsForWorkspace` | Every queue page load (workspace-scoped) |
| `claimItem` | Before the atomic claim — expires that row so a stale holder cannot block |
| `GET /api/queue/snapshot` | Client polls while claimed rows are visible (sweep + return current state) |
| `POST /api/claims/sweep` | Manual / external cron (session required; scoped to the user’s workspace) |

Guarantee: **eventually** expired under traffic or while the queue UI is open with claimed rows (snapshot poll). Idle tabs without claimed rows need list traffic or cron.

## Resolve after expiry

If the holder resolves after the claim is past TTL:

1. Domain expires the row (`open`) if needed.
2. Resolve fails with `409 invalid_state` and `Claim expired; item returned to the open queue.`
3. UI sets the row to open and shows a warning notice (no silent success).

Release follows the same expiry-first rule.

Fresh resolves still use a conditional `UPDATE … claimedAt >= cutoff` inside the outbox transaction so a claim that ages out mid-request cannot resolve.
