import { UserPicker, type SessionPickerUser } from "@/components/session/UserPicker";
import type { SessionUser } from "@/lib/auth/session";

type Props = {
  users: SessionPickerUser[];
  session: SessionUser | null;
};

export function SessionPanel({ users, session }: Props) {
  return (
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
  );
}
