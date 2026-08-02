# R1 — Claim once

## Approach

**One conditional `UPDATE`** on `items` joined to `memberships`: set `status='claimed'`, `claimed_by_id`, `claimed_at=NOW()` only when `status='open'` and the caller is an **owner/member** in the item’s workspace. Concurrent claims race on that row — exactly one `RETURNING` winner; losers take a read-only diagnose path.

Lost races return domain `outcome: "already_claimed"` with the current holder — **not** a thrown error. Clients must branch on **`outcome`**, not only the HTTP status (lost claim is intentionally **200**).

Before the UPDATE, `expireStaleClaimById` runs (R5) so a stale holder cannot block a fresh claim.

## Key files

| Path | Role |
|------|------|
| `src/lib/triage/claim.ts` | Atomic UPDATE + `diagnoseLostClaim` |
| `src/app/api/items/[id]/claim/route.ts` | HTTP mapping |
| `tests/domain/claim.test.ts` | Sequential + parallel domain races |
| `scripts/r1-claim-race.ts` | HTTP parallel harness (`npm run test:r1`) |

## HTTP outcomes

| Case | Status | Body |
|------|--------|------|
| Won | **200** | `{ ok: true, outcome: "won", item }` |
| Lost race | **200** | `{ ok: false, outcome: "already_claimed", message, item, holder }` |
| Viewer / foreign workspace | **403** | `{ error: "forbidden", … }` |
| Unknown id | **404** | `{ error: "not_found", … }` |
| No session | **401** | `{ error: "unauthorized", … }` |

## Guarantee

Atomic `UPDATE … WHERE status='open'` — **exactly one DB holder**. Lost claim is an **outcome**, not an error (`DECISIONS.md` §1).

## Verify

```bash
npx vitest run tests/domain/claim.test.ts

# HTTP race (dev server + DB)
npm run dev          # terminal A
npm run test:r1      # terminal B
```

## Limitation

Other tabs learn the new holder on their next claim / list / refresh — R1 guarantees one DB winner, not instant multi-tab sync.
