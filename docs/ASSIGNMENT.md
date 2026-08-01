# Flamingo Home Assignment — Full-Stack Engineer V3

Source: local DOCX / Google Doc. Kept in-repo as the source of truth for this submission.

Build a small app and extend it with five requirements. Three are required, two are optional. Each one has an obvious implementation that's wrong in a way that matters, and that's the part we read. A CRUD app with a login is one prompt away from done now, so we've put the difficulty in the requirements rather than the feature list.

## USE AI

We build with AI assistants every day and expect you to use them here — including for the whole scaffold, which we don't score. No penalty, no detector, no points for suffering. There's a short required write-up on how you used them.

## Scope

R1, R2 and R3 are required. R4 and R5 are optional. Do the required three properly before touching the optional two — three solved well beats five solved shallowly, and we read what you skipped as seriously as what you built. Skipping an optional one is fine: say in a line or two how you'd have approached it. That answer scores; a half-finished attempt often doesn't.

**This submission implements all five (R1–R5).** Depth on R1–R3 still comes first.

## Stack and setup

Next.js App Router + TypeScript + Tailwind, Prisma against Supabase Postgres, deployed on Vercel. Free tiers are enough; nothing here should cost money. Scaffold however you like — create-next-app, a template, your assistant — none of it is scored, so don't spend care there.

Don't build real OAuth — a dropdown that picks one of a few seeded users and sets a signed cookie is exactly what we want. And seed roughly 10,000 items early, with a realistic status spread rather than an even one; one `generate_series` statement in the Supabase SQL editor does it in seconds. Everything below reads differently against ten rows than ten thousand.

**This repo targets Next.js 16 and Node 24.** Reviewers on Node 20.9+ (Next 16 minimum) should still be able to run it.

## The app

Triage — a team works through a shared queue. A member claims an item so nobody duplicates the work, then resolves it or releases it back. That's the whole product. The interesting part is what happens when several people do this at once. The schema is yours to design, and it's part of what we read.

- **R1 Claim once.** Two members claim the same item simultaneously: exactly one wins, the other learns who has it, and the UI reconciles without a manual refresh. This must hold under real concurrency, not just when clicks arrive in order. Ship something we can run to verify it.
- **R2 Sealed workspaces.** Items belong to a workspace; roles are owner / member / viewer, and a viewer reads but can't claim, resolve or release. No cross-workspace read or write through any route — assume someone is pasting an item ID into curl. Tell us where the check lives and why there.
- **R3 Resolving notifies.** Write a `notify()` that sleeps about a second and throws on roughly one call in five, then live with it — making it reliable isn't allowed. Resolving must not wait on it, nothing disappears silently, and you're on serverless: no process is still running after the response goes out. State the guarantee you actually built — at-least-once, at-most-once, best-effort-with-a-record. Naming it honestly matters more than making it bulletproof.
- **R4 The queue moves while you read it.** (optional) Items are claimed and resolved by others as someone pages through: ordering stays stable, pages don't skip or repeat rows. With ~10k rows and filters, it shouldn't be fetched whole either. Name your pagination approach and its failure mode, and paste EXPLAIN ANALYZE for a deep page under the naive approach and under yours.
- **R5 Claims go stale.** (optional) A claim older than 30 minutes returns to the queue. There's no daemon on Vercel, so tell us who runs the sweep — and decide what should happen to a resolve that arrives after the claim already expired.

## The interface counts too

This is a tool someone stares at all day, so the UI is part of the work — not as decoration, but as whether it tells the truth about state. Who holds this item right now? What do I see when my claim loses the race — a clear result, or a button that silently does nothing? Does resolving feel immediate while the notification is still in flight? Are loading, empty and error states real, or afterthoughts? Density beats polish, and Tailwind defaults are fine. A plain interface that never lies beats a beautiful one that does.

## Deliver

A public repo with incremental commits; a single squashed initial commit isn't a valid submission, since the history is part of what we read. Plus a deployed URL, since we'd rather click the interface than imagine it. If the deploy fights you, ship it runnable and say what broke. Inside:

- **README.md** — how to run it, seed it, and verify R1, plus the live URL. Assume a competent engineer with Node 20 and a fresh Supabase project.
- **DECISIONS.md** — four decisions. Each one: context that forced a choice / what you chose / the strongest alternative you rejected, and what ruled it out / what it costs / what makes it wrong later (100× traffic, ten engineers, the next requirement you can see coming). Then three things you deliberately didn't do, and one line on what part of your own code you'd refactor first on day one of a real project, and why you left it.
- **AI_USAGE.md** — three answers. Where you used it. Two places you disagreed with it, what you did instead, and why — link the lines. How you verified its output, naming specific checks (“I read it carefully” doesn't distinguish anyone from anyone).

## Skip these

Real OAuth. Design systems, component libraries, animation, illustration — see above for what we do mean by interface. Polished scaffolding, since we don't read it. Exhaustive test coverage; test where it bought you something and say so in a sentence. Mobile, dark mode, i18n, accessibility. Anything that costs money — free tiers only; if a paid service is the right answer, say so instead of buying it.

## Ground rules

Overclaiming — documentation asserting a guarantee the code doesn't provide — costs you more than the missing guarantee would have. And noticing beats building: flagging a race you had no time to fix counts for more than quietly shipping one.

Parts of this spec are underdetermined on purpose: where you find a gap, close it, note the assumption in DECISIONS.md, and move on. And tell us roughly how long it took — that's calibration data about our spec, not a judgement of you.
