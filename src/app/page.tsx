import { UserPicker } from "@/components/UserPicker";
import { getSessionUser, listSeededUsersForPicker } from "@/lib/auth/session";

export default async function Home() {
  const [users, session] = await Promise.all([
    listSeededUsersForPicker(),
    getSessionUser(),
  ]);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-wide text-zinc-500">
            flamingo-assignment
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Triage</h1>
          <p className="text-sm text-zinc-600">
            Fake auth: pick a seeded user. Session is an HMAC-signed httpOnly
            cookie (no OAuth).
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

        <p className="text-xs text-zinc-500">
          Queue list lands in step 2.2. Cookie name:{" "}
          <code className="rounded bg-zinc-100 px-1">flamingo_session</code>
        </p>
      </main>
    </div>
  );
}
