# R2 — Sealed workspaces

## Approach

**Workspace ACL lives in domain**, not UI button hiding. Every item touch checks membership on that row’s `workspaceId`; mutations require **owner/member** via `roleCanMutate`.

- Resolve / release: `assertItemAccess(userId, itemId, { mutate })`
- Claim: ACL inside the same `UPDATE … JOIN memberships … role IN ('owner','member')` (no TOCTOU before the write)
- List: `assertWorkspaceMember` on the workspace

Foreign workspace item IDs → **`403 forbidden`** (not a leaky cross-workspace 404). Viewers may **list** the queue; claim/resolve/release → 403. UI hides buttons for Dave; curl with a forged session is still blocked server-side.

## Key files

| Path | Role |
|------|------|
| `src/lib/triage/access.ts` | `assertItemAccess` |
| `src/lib/auth/membership.ts` | Roles, `assertCanMutate`, workspace membership |
| `src/lib/triage/claim.ts` | Claim sealed via JOIN |
| `src/lib/triage/resolve.ts` / `release.ts` | Access before mutate |
| `tests/domain/r2-seal.test.ts` | Foreign workspace, viewer, list ACL |

## HTTP outcomes

| Action | Allowed | Denied |
|--------|---------|--------|
| List queue | Any member (incl. viewer) | Non-member → **403** |
| Claim / resolve / release | Owner / member | Foreign → **403**; viewer → **403** |

Typical messages: `"Not a member of this workspace."` / `"Viewers can read the queue but cannot claim, resolve, or release."`

## Guarantee

**Decision 2** (`DECISIONS.md`): ACL in domain; UI only hides buttons for viewers.

## Verify

```bash
npx vitest run tests/domain/r2-seal.test.ts
# Manual: pick usr_dave — queue visible, no Claim/Resolve/Release
```

## Limitation

Every new item mutation must call `assertItemAccess` (or embed the membership JOIN). Forgetting that on a new route re-opens the seal.
