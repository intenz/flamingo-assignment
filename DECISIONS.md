# Decisions

Four scored decisions will be written here as they are forced by implementation. Template for each:

**Context** that forced a choice / **Chose** / **Rejected** (strongest alternative + why) / **Costs** / **Wrong later** (100× traffic, ten engineers, next requirement).

---

## Decisions

_(none yet — filled during R1–R5 and schema work)_

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
