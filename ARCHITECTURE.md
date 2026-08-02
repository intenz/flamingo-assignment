# Architecture

Target architecture for the Flamingo triage queue. Deep trade-offs land in `DECISIONS.md` as we build. Spec: `docs/ASSIGNMENT.md`. Plan: `PLAN.md`.

This file starts thin; R1–R5 details are filled in when those steps land.

## Purpose

A shared **triage queue** per workspace. Members **claim** an item (exactly one holder), then **resolve** or **release**. Viewers read only. Concurrency, workspace isolation, serverless notify, stable paging, and stale claims are the scored surface.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node 24 (`.nvmrc`); Next.js 16 requires ≥20.9 |
| App | Next.js 16 App Router, TypeScript, Tailwind |
| ORM / DB | Prisma → Supabase Postgres |
| Auth | Seeded-user dropdown + HMAC-signed session cookie (no OAuth) |
| Deploy | Vercel (serverless); free tiers only |

```text
┌─────────────┐     signed cookie      ┌──────────────────────┐
│  Browser UI │ ─────────────────────► │  Next.js Route Handlers
│  (App Router)│ ◄── JSON + revalidate │  / server actions    │
└─────────────┘                        └──────────┬───────────┘
                                                  │ Prisma
                                                  ▼
                                       ┌──────────────────────┐
                                       │  Supabase Postgres   │
                                       │  users, workspaces,  │
                                       │  memberships, items  │
                                       │  (+ outbox later)    │
                                       └──────────────────────┘
```

## Domain model (initial)

```text
User ──────── < Membership > ──────── Workspace
  │               role:                 │
  │               owner|member|viewer   │
  │                                     │
  └── claimedBy ──► Item ◄── workspaceId┘
                      status: open | claimed | resolved
                      claimedAt, claimedById
                      title, body, createdAt
```

### Item status machine

```text
                 claim (atomic)
     open ──────────────────────► claimed
      ▲                              │
      │ release / stale expiry (R5)  │ resolve
      └──────────────────────────────┤
                                     ▼
                                 resolved
```

## Layers

| Layer | Responsibility |
|-------|----------------|
| UI (`app/`) | Truthful state: holder, lost race, notify pending/failed, cursors, empty/loading/error. Density over polish. |
| HTTP API (`app/api/…`) | Auth from cookie, parse input, map domain errors → status codes. |
| Access (`lib/auth`, `lib/access`) | Session parse/verify; workspace ACL on every item read/mutation (R2). |
| Domain (`lib/triage`) | Claim / resolve / release / list / expire / enqueue-notify. Concurrency rules live here. |
| Data (Prisma) | Schema, indexes, transactions. No business rules only in the client. |

**Security boundary:** server-side access helper + DB predicates. Hiding buttons in the UI is not enough (R2).

## SOLID (structure)

| Principle | Practice |
|-----------|----------|
| **S** | Route = HTTP. `lib/access` = ACL. `lib/triage/*` = one use-case each. UI component = one concern. |
| **O** | Add behavior with new modules (outbox drain, stale sweep) instead of bloating claim. |
| **D** | Domain code must not import `next/headers` or React; adapters call domain. |

## Requirement mapping (to fill)

| Req | Intent | Design note |
|-----|--------|-------------|
| R1 | Exactly one claim winner | Conditional DB update; conflict returns holder |
| R2 | No cross-workspace; viewer read-only | Central server ACL + workspace-scoped queries |
| R3 | Resolve ≠ wait on flaky notify | Durable outbox; honest delivery guarantee |
| R4 | Stable pages under churn | Keyset on `(createdAt, id)` via `after=<id>`; failure mode + EXPLAIN in `docs/r4-pagination.md` |
| R5 | Claims expire after 30m | List/claim + `POST /api/claims/sweep`; resolve-after-expiry → open + 409 — `docs/r5-stale-claims.md` |

## Out of scope

Real OAuth, design systems / animation polish, exhaustive tests, mobile / dark / i18n / a11y, paid services.
