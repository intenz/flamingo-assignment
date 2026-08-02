# R2 — Sealed workspaces

## Approach

**Workspace ACL lives in domain**, not UI button hiding. Every item touch checks membership on that row’s `workspaceId`; mutations require **owner/member** via `roleCanMutate`.

- Resolve / release: `requireItemAccess(userId, itemId, { mutate })`
- Claim: ACL inside the same `UPDATE … JOIN memberships … role IN ('owner','member')` (no TOCTOU before the write)
- List: `assertWorkspaceMember` on the workspace

Foreign workspace item IDs → **`403 forbidden`** (not a leaky cross-workspace 404). Viewers may **list** the queue; claim/resolve/release → 403. UI hides buttons for Dave; curl with a forged session is still blocked server-side.

## Key files

| Path | Role |
|------|------|
| `src/lib/triage/queue/actions/require-item-access.ts` | `requireItemAccess` |
| `src/lib/auth/membership.ts` | Roles, `assertCanMutate`, workspace membership |
| `src/lib/triage/queue/actions/claim.ts` | Claim sealed via JOIN |
| `src/lib/triage/queue/actions/resolve.ts` / `release.ts` | Access before mutate |
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

### Curl (dev server up)

Viewer and foreign-workspace denials are sealed server-side. With `SESSION_SECRET` in `.env`:

```bash
# Cookie for Dave (viewer)
COOKIE=$(npx tsx -e 'import "dotenv/config"; import { encodeSessionCookie } from "./src/lib/auth/cookie.ts"; process.stdout.write(encodeSessionCookie("usr_dave"))')

# Expect 403 — viewers cannot claim
curl -s -w "\n%{http_code}\n" -X POST \
  -H "Cookie: flamingo_session=$COOKIE" \
  http://localhost:3000/api/queue/queue-actions/itm_00001/claim
```

Pick any real open item id from the UI if `itm_00001` is missing. Foreign workspace ids similarly return **403** (`Not a member of this workspace.`) for a user who is only on `ws_flamingo`.

## Limitation

Every new item mutation must call `requireItemAccess` (or embed the membership JOIN). Forgetting that on a new route re-opens the seal.
