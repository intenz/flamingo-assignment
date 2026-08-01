# flamingo-assignment

Concurrent triage queue for the Flamingo Full-Stack home assignment (R1–R5).

Spec: [`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md) · Design: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Plan: [`PLAN.md`](PLAN.md) · Decisions: [`DECISIONS.md`](DECISIONS.md) · AI: [`AI_USAGE.md`](AI_USAGE.md)

## Stack

Next.js **16.2** App Router · Node **24** (`.nvmrc`) · TypeScript · Tailwind 4 · Prisma → Supabase Postgres (next) · fake cookie auth · Vercel

```bash
nvm use   # reads .nvmrc → 24
cp .env.example .env
# set DATABASE_URL (Supabase Postgres) + SESSION_SECRET
npm install
npm run db:generate
npm run dev
```

## Status

Prisma 7 wired (`src/lib/prisma.ts`). Schema models land in step 1.2.
