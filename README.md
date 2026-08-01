# flamingo-assignment

Concurrent triage queue for the Flamingo Full-Stack home assignment (R1–R5).

Spec: [`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md) · Design: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Plan: [`PLAN.md`](PLAN.md) · Decisions: [`DECISIONS.md`](DECISIONS.md) · AI: [`AI_USAGE.md`](AI_USAGE.md)

## Stack

Next.js **16.2** App Router · Node **24** (`.nvmrc`) · TypeScript · Tailwind 4 · Prisma → Supabase Postgres (next) · fake cookie auth · Vercel

```bash
nvm use   # reads .nvmrc → 24
cp .env.example .env
npm install
npm run db:up          # local Prisma Postgres (detached)
# if the printed port differs from .env, update DATABASE_URL
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### Seeded users (`ws_flamingo`)

| id | name | role |
|----|------|------|
| `usr_alice` | Alice Owner | owner |
| `usr_bob` | Bob Member | member |
| `usr_carol` | Carol Member | member |
| `usr_dave` | Dave Viewer | viewer |

~10 000 items: ~82% open / ~12% claimed / ~6% resolved.

**Database (dev):** local via `prisma dev` (`npm run db:up` / `db:down`). Supabase can replace `DATABASE_URL` later for deploy.

## Status

Schema + seed done. Auth / queue UI next (phase 2).
