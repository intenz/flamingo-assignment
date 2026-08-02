# Decisions

More entries as we test R1–R5. Format: context / chose / rejected / costs / wrong later.

---

## 0. Clear names, domain folders, thin client islands

**Context:** Vague names and flat dumps made the tree hard to navigate; client files kept pulling server-only code. Need a standing default for the whole app.

**Chose:** Name by what the thing *does* in its domain (not UI jargon or opaque helpers). Group files by domain under `components/`, `hooks/`, `lib/`, `app/api/`. RSC owns first paint and data loading; `"use client"` only where there is state, effects, or browser APIs. Shared interactive state lives in one place and is passed down — do not duplicate the same hook for parent and child. Types shared with the client stay free of Prisma/DB imports.

**Example (queue):** `QueueItemStatus` / `reopenStaleClaims` / `useQueueActions` — not `StatusPill` / `expire…` / `run`. Layout: `components/queue/…`, `hooks/queue/`, `lib/triage/queue/…`, `api/queue/…`. Server renders the first page; client islands patch the row and load more.

**Rejected:** Speculative Context/splits “for purity”; Prisma (or other Node-only modules) in client bundles; full RSC refresh after every small UI mutation when a local patch is enough (see §1).

**Costs:** Longer paths; new code must land in the right domain folder.

**Wrong later:** Cross-tab / realtime sync still needs an invalidation story — structure alone won’t fix that.

---

## 1. Server shell, client row updates

**Context:** First paint needs auth + queue from the server; every Claim/Resolve must not reload the whole page.

**Chose:** RSC loads session, picker users, and the first table page ([`page.tsx`](src/app/page.tsx)). Claim/Resolve/Release only patch the row on the client ([`useQueueActions.ts`](src/hooks/queue/useQueueActions.ts)). User switch does one server refresh ([`UserPicker.tsx`](src/components/session/UserPicker.tsx)).

**Rejected:** `router.refresh()` after every row action (slow; wastes App Router).

**Costs:** Other tabs / deeper pages can lag until the next navigation.

**Wrong later:** Heavy multiplayer needs invalidation or realtime, not only local row state.
