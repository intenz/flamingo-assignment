"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAsUser, logout } from "@/app/actions/auth";
import type { MembershipRole } from "@/generated/prisma/client";

export type PickerUser = {
  id: string;
  name: string;
  role: MembershipRole | null;
};

type Props = {
  users: PickerUser[];
  currentUserId: string | null;
};

export function UserPicker({ users, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(userId: string) {
    setError(null);
    startTransition(async () => {
      if (!userId) {
        const result = await logout();
        if (!result.ok) setError(result.error);
        else router.refresh();
        return;
      }
      const result = await loginAsUser(userId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="user-picker" className="text-sm font-medium text-foreground">
        Act as
      </label>
      <select
        id="user-picker"
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-flamingo-pink focus:ring-2 focus:ring-flamingo-pink-soft disabled:opacity-60"
        value={currentUserId ?? ""}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— not signed in —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.role ? ` (${u.role})` : ""}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {pending ? <p className="text-xs text-muted">Updating session…</p> : null}
    </div>
  );
}
