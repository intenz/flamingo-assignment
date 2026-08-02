# Deploy (Vercel + shared Supabase)

Uses the **same Supabase project and tables** as `flamingo-triage`
(`users`, `workspaces`, `memberships`, `items`, `notify_outbox`).
Prisma schema is aligned (mapped columns, `Role`, outbox `delivered`).

## Prerequisites

1. **GitHub** — push `main` (`gh auth refresh` if needed).
2. **DATABASE_URL** — same pooler URI as flamingo-triage (see `.env.production`).
3. **SESSION_SECRET** — can reuse triage’s secret or set a new one on Vercel.
4. **Vercel** — `npx vercel login`.

## Schema / seed

Production tables already exist from flamingo-triage. Do **not** run assignment-only migrations that recreate them.

```bash
# Optional: re-seed shared tables (wipes triage data too)
export DATABASE_URL="…"   # from flamingo-triage
npm run db:seed
```

Local `prisma-dev`: `npx prisma db push` after `npm run db:up`.

## Deploy

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add SESSION_SECRET production
npx vercel --prod
```

Confirm Node.js **≥20.9** in project settings (see `package.json` `engines`; matches Next 16 + assignment “Node 20”).

For reviewers: turn **off Deployment Protection** (Vercel → Project → Settings → Deployment Protection) so https://flamingo-assignment.vercel.app opens without a Vercel login.
