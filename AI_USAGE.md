# AI usage

Required write-up for the Flamingo assignment. Fill as work proceeds; finalize in step 8.3.

## Where AI was used

- **Scaffold:** Next.js 16 + Node 24, Prisma 7, seed, Vitest stubs.
- **Auth / triage shell:** HMAC cookie picker; queue list; claim/resolve/release stubs.
- **Visual:** light flamingo.run tokens + mark, DM Sans / Azeret Mono, Id·Title·Status·Holder·Created·Actions, ~90% width, seed statuses mixed so newest-first isn’t all resolved.

## Disagreements (two places)

For each: what the assistant suggested / what we did instead / why / link to lines.

1. **Seed status vs newest-first** — block-assigned statuses made the first page all `resolved`; reshuffled across time in [`prisma/seed.ts`](prisma/seed.ts).
2. **_(second disagreement TBD as R1–R5 land)_**

## How output was verified

| Check | Command / method | When added |
|-------|------------------|------------|
| Unit + smoke suite | `npm test` | 1.4 / 2.1 / 2.4 |
| Production build | `npm run build` | each UI/API step |
| Manual UI | `npm run dev` → http://localhost:3000 | 2.5 |
