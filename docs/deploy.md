# Deploy (Vercel + Postgres)

## Prerequisites

1. **GitHub** — push `main` (`gh auth refresh -h github.com` if token expired).
2. **Postgres** — Supabase (or any hosted Postgres). Copy the **pooler** connection string into `DATABASE_URL`.
3. **Vercel** — `npx vercel login`, then link the GitHub repo.

## One-time setup

```bash
# 1. Apply schema + seed against production DATABASE_URL
export DATABASE_URL="postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true"
npx prisma migrate deploy
npm run db:seed

# 2. Deploy
npx vercel link          # link to the GitHub project
npx vercel env add DATABASE_URL production
npx vercel env add SESSION_SECRET production   # long random string
npx vercel --prod
```

In the Vercel dashboard, confirm **Node.js Version = 24.x** (also set via `package.json` `engines.node`).

Build command is already `prisma generate && next build` (`npm run build`).

## After deploy

- Paste the live URL into README / assignment submission.
- Smoke: pick Bob → Claim → Resolve; pick Dave → read-only queue.
