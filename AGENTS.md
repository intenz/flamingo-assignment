<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:flamingo-architecture -->
# Architecture defaults (DECISIONS.md §0)

- Name by domain intent — not UI jargon or vague helpers.
- Group by domain under `components/`, `hooks/`, `lib/`, `app/api/`.
- RSC = first paint + data; client only for state / events / browser APIs.
- One owner for shared interactive state; pass props down — no duplicate hooks.
- No Prisma/DB in client; no speculative Context; prefer local patch over full refresh when enough (see §1).
<!-- END:flamingo-architecture -->
