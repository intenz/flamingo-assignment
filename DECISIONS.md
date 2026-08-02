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

### 3. Resolve returns immediately; notify is durable outbox, not in-request retries

**Context:** Spec forbids making `notify()` reliable and forbids waiting on it before resolve returns; we are on serverless so work after the response must not assume a long-lived process. Early UI auto-drained the outbox in a poll loop, which felt like hidden retries of the flaky helper and made the page noisy.  
**Chose:** (1) Persist a `NotifyOutbox` row in the same transaction as `item → resolved`. (2) Schedule one drain via Next.js `after()` (platform `waitUntil`) plus `POST /api/outbox/drain` for ops/cron. (3) UI only **polls status** after resolve; a failed delivery stays visible and a **second Resolve click** re-drains that outbox — no automatic client retry storm. Guarantee named: **at-least-once** while the row is `pending`/`failed` under max attempts (record survives process death; duplicate drains are acceptable).  
**Rejected:** Awaiting `notify()` in the resolve request (blocks ~1s and fails ~1/5 of resolves); fire-and-forget without a DB row (silent loss on serverless); continuous auto-retry from the browser (re-implements “fix notify” and confuses “retry N” with delivery state).  
**Costs:** Reviewers must understand Resolve HTTP 200 ≠ notify delivered; Holder keeps `claimedById` as the resolver for display; ops may need the drain route if `after()` is truncated.  
**Wrong later:** At higher volume you want a real worker/queue, idempotent notify keys, and backoff — not browser-driven Resolve clicks.  
**Commit:** `3cceeb6`

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
| 5.3 | UI polls outbox status; failed → click Resolve again to re-drain (no auto client retries). |
