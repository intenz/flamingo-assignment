import { BrandMark } from "@/components/BrandMark";
import { UserPicker } from "@/components/UserPicker";
import { QueueList } from "@/components/QueueList";
import { getSessionUser, listSeededUsersForPicker } from "@/lib/auth/session";
import {
  QUEUE_PAGE_SIZE,
  listItemsForWorkspace,
} from "@/lib/triage/list-items";

export default async function Home() {
  const [users, session] = await Promise.all([
    listSeededUsersForPicker(),
    getSessionUser(),
  ]);

  const canReadQueue = Boolean(session?.workspaceId && session?.id);
  const items = canReadQueue
    ? await listItemsForWorkspace(
        session!.workspaceId!,
        session!.id,
        QUEUE_PAGE_SIZE,
      )
    : [];

  return (
    <div className="min-h-full bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--flamingo-pink-soft)_0%,_transparent_55%)] opacity-70"
      />
      <main className="relative mx-auto flex w-[90%] max-w-[90%] flex-col gap-8 px-6 py-12">
        <header className="flex items-start gap-4">
          <BrandMark size={44} />
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-flamingo-cyan">
              Flamingo
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Triage
            </h1>
            <p className="max-w-xl text-sm text-muted">
              Shared queue per workspace. Claim an item so nobody duplicates the
              work — then resolve or release.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <UserPicker users={users} currentUserId={session?.id ?? null} />

          <dl className="mt-6 grid gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 text-muted">Signed in</dt>
              <dd className="font-medium">
                {session ? `${session.name} (${session.id})` : "nobody"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-muted">Role</dt>
              <dd className="font-medium">{session?.role ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-muted">Workspace</dt>
              <dd className="font-medium">{session?.workspaceId ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Queue</h2>
            <span className="font-mono text-xs text-muted">ws_flamingo</span>
          </div>

          {!session ? (
            <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
              Pick a user above to load the workspace queue.
            </p>
          ) : !canReadQueue ? (
            <p className="rounded-2xl border border-danger-soft bg-danger-soft px-4 py-8 text-center text-sm text-danger">
              No membership in this workspace — nothing to show.
            </p>
          ) : (
            <QueueList
              items={items}
              cappedAt={QUEUE_PAGE_SIZE}
              currentUserId={session?.id ?? null}
            />
          )}
        </section>
      </main>
    </div>
  );
}
