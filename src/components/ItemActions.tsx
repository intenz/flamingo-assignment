"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { QueueItemRow } from "@/lib/triage/list-items";

type Action = "claim" | "resolve" | "release";

type Props = {
  item: QueueItemRow;
  currentUserId: string | null;
};

export function ItemActions({ item, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const canClaim = item.status === "open" && Boolean(currentUserId);
  const isHolder =
    item.status === "claimed" && item.claimedById === currentUserId;
  const canResolve = isHolder;
  const canRelease = isHolder;

  function run(action: Action) {
    setNotice(null);
    startTransition(async () => {
      const res = await fetch(`/api/items/${item.id}/${action}`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setNotice(body.message ?? body.error ?? `Failed (${res.status})`);
        router.refresh();
        return;
      }
      setNotice(null);
      router.refresh();
    });
  }

  if (!currentUserId) {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        <ActionButton
          label="Claim"
          variant="primary"
          disabled={!canClaim || pending}
          onClick={() => run("claim")}
        />
        <ActionButton
          label="Resolve"
          variant="secondary"
          disabled={!canResolve || pending}
          onClick={() => run("resolve")}
        />
        <ActionButton
          label="Release"
          variant="ghost"
          disabled={!canRelease || pending}
          onClick={() => run("release")}
        />
      </div>
      {notice ? <p className="text-xs text-warning">{notice}</p> : null}
      {pending ? <p className="text-xs text-muted">Working…</p> : null}
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  variant: "primary" | "secondary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "border-flamingo-pink bg-flamingo-pink text-white hover:bg-flamingo-pink-hover"
      : variant === "secondary"
        ? "border-flamingo-cyan bg-flamingo-cyan-soft text-flamingo-cyan hover:brightness-95"
        : "border-border bg-card text-foreground hover:bg-surface";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {label}
    </button>
  );
}
