# Decisions

Four scored decisions will be written here as they are forced by implementation. Template for each:

**Context** that forced a choice / **Chose** / **Rejected** (strongest alternative + why) / **Costs** / **Wrong later** (100× traffic, ten engineers, next requirement).

---

## Decisions

### 1. Lost claim is an outcome, not an error

**Context:** A lost claim race is expected concurrency, so treating it as a hard error makes the UI look broken.  
**Chose:** Atomic `UPDATE … WHERE status='open'`, returning HTTP 200 + `already_claimed` with holder so the UI can notice, update Holder, and disable Claim.  
**Rejected:** HTTP 409 / thrown `invalid_state` on every loss — fine for strict REST, wrong for a calm triage tool.  
**Costs:** Clients must branch on `outcome`, not only status codes.  
**Wrong later:** At higher traffic you’ll want clearer metrics so `already_claimed` isn’t counted as generic success.  
**Commit:** `7c56a4a`

### 2. Workspace ACL lives in domain, not the UI

**Context:** Curl with a pasted item ID must not read or mutate across workspaces; viewers must not claim/resolve/release even if they forge a request.  
**Chose:** Central checks in domain — `assertItemAccess` / membership helpers for resolve·release·list; claim seals via `UPDATE … JOIN Membership` (owner/member only). Foreign workspace → `403 forbidden`. UI only hides buttons for viewers.  
**Rejected:** Route-only guards (easy to forget on the next endpoint) and “hide buttons = secure” (curl bypasses the UI).  
**Costs:** Every new item mutation must call the same helpers (or join Membership).  
**Wrong later:** Multi-workspace product UIs will need richer membership caching; the seal should stay server-side.  
**Commit:** `2f21000`

### 3. Resolve returns immediately; notify is a durable outbox

**Context:** Resolve must not wait on flaky `notify()`, and serverless cannot rely on work after the response without a durable record.  
**Chose:** Write `NotifyOutbox` in the same TX as resolve, drain once via `after()` (plus `/api/outbox/drain`), UI polls status and retries only on a second Resolve click — guarantee **at-least-once**.  
**Rejected:** Awaiting `notify()` in-request, fire-and-forget without a DB row, and automatic browser retry loops that re-fix the flaky helper.  
**Costs:** HTTP 200 on resolve does not mean notify delivered.  
**Wrong later:** High traffic needs a real worker queue with backoff, not Resolve-click retries.  
**Commit:** `3cceeb6`

### 4. Queue pages with keyset `after=<id>`, not OFFSET

**Context:** The queue moves while someone loads more; OFFSET shifts under head inserts and deep pages get expensive on ~10k+ rows.  
**Chose:** Keyset on `(createdAt, id)` with `after=<lastItemId>` (server resolves the sort key) plus Load more — see `docs/r4-pagination.md` for EXPLAIN ANALYZE.  
**Rejected:** OFFSET/LIMIT (duplicates under churn) and fetching the whole workspace queue.  
**Costs:** Brand-new head inserts are invisible until refresh; a deleted `after` anchor returns 404.  
**Wrong later:** Heavy filters need matching composite indexes; very large tables want index-only seeks without sorting the older half.  
**Commit:** `6fe7c16`

---

## Deliberately not done

_(three items — filled near ship)_

---

## Day-one refactor

_(one line — filled near ship)_

---

## Assumptions / gaps closed

| When | Assumption |
|------|------------|
| 0.2 | Implementing all five requirements (R1–R5), not only required R1–R3. |
| 0.2 | Target runtime Node 24; README will also note Next 16’s Node ≥20.9 floor for reviewers. |
| 1.1 | Prisma 7 + `@prisma/adapter-pg`; client singleton at `src/lib/prisma.ts`. Generated client under `src/generated/prisma` (gitignored). |
| 1.1b | Dev DB is **local** `prisma dev` (not Supabase yet). Port may change after restart — sync `DATABASE_URL`. Supabase later for Vercel. |
| 1.2 | Opaque string IDs; MembershipRole + ItemStatus enums; NotifyOutbox deferred to R3. Indexes for workspace queue + keyset `(createdAt, id)`. |
| 1.3 | Seed via Prisma `createMany` batches; ~82/12/6 status skew; Alice/Bob/Carol/Dave on `ws_flamingo`. Generator `moduleFormat = "cjs"` so tsx/Next see model delegates. |
| 1.4 | Vitest (node env) + smoke harness; `test:r1` stub until claim API exists. Same `DATABASE_URL` as app for now. |
| 2.1 | HMAC-SHA256 signed `flamingo_session` cookie; login/logout via Server Actions; picker shows role from `ws_flamingo`. |
| 2.2 | Queue RSC lists first 50 newest via `listItemsForWorkspace`; unsigned → prompt; no membership → error. |
| 2.3 | HTTP `POST /api/items/[id]/{claim,resolve,release}` + row buttons; domain stubs not yet atomic/ACL-hardened. |
| 2.4 | Smoke: list ≤50; claim/release on fixture `itm_test_smoke_claim`; invalid cookie → null userId. |
| 2.5 | Light Flamingo ODS tokens (pink `#f357bb`, cyan `#058c83`, bg `#fafafa`); mark from flamingo.cx; DM Sans + Azeret Mono. |
| 3.1 | Atomic `updateMany` where `status=open`; lost race → `already_claimed` result (not thrown), for tooltip UI in 3.3. |
| 4.2 | Seal in domain (`assertItemAccess` + claim JOIN Membership); foreign → 403; list requires membership. |
| 4.3 | Viewer: no action buttons in UI; API still 403 via `roleCanMutate` / claim JOIN. |
| 5.2 | `NotifyOutbox` + resolve TX; `after()` first drain; no await notify on HTTP resolve. |
| 5.3 | UI polls outbox status; failed → click Resolve again to re-drain (no auto client retries). List hydrates pending/failed notify after refresh. |
| 6.2 | Queue pages via `after=<lastItemId>`; server looks up `(createdAt, id)` for keyset. `GET /api/queue` + Load more. Failure mode + EXPLAIN: `docs/r4-pagination.md`. |
