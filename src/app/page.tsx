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

  const canReadQueue = Boolean(session?.workspaceId);
  const items = canReadQueue
    ? await listItemsForWorkspace(session!.workspaceId!, QUEUE_PAGE_SIZE)
    : [];

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-wide text-zinc-500">
            flamingo-assignment
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Triage</h1>
          <p className="text-sm text-zinc-600">
            Shared queue per workspace. Claim / resolve actions land next.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <UserPicker users={users} currentUserId={session?.id ?? null} />

          <dl className="mt-6 grid gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 text-zinc-500">Signed in</dt>
              <dd className="font-medium">
                {session ? `${session.name} (${session.id})` : "nobody"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-zinc-500">Role</dt>
              <dd className="font-medium">{session?.role ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-zinc-500">Workspace</dt>
              <dd className="font-medium">{session?.workspaceId ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Queue</h2>

          {!session ? (
            <p className="rounded border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-600">
              Pick a user above to load the workspace queue.
            </p>
          ) : !canReadQueue ? (
            <p className="rounded border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800">
              No membership in this workspace — nothing to show.
            </p>
          ) : (
            <QueueList items={items} cappedAt={QUEUE_PAGE_SIZE} />
          )}
        </section>
      </main>
    </div>
  );
}
