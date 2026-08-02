"use client";

import { ActionNoticeBanner } from "@/components/ActionNoticeBanner";
import type { ActionNotice } from "@/lib/triage/item-row-view";

type Props = {
  canClaim: boolean;
  isHolder: boolean;
  /** Resolved item with pending/failed notify — Resolve retries delivery. */
  canRetryNotify: boolean;
  pending: boolean;
  notice: ActionNotice | null;
  onClaim: () => void;
  onResolve: () => void;
  onRelease: () => void;
};

export function ItemActionButtons({
  canClaim,
  isHolder,
  canRetryNotify,
  pending,
  notice,
  onClaim,
  onResolve,
  onRelease,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1" aria-busy={pending || undefined}>
        <ActionButton
          label="Claim"
          disabled={!canClaim || pending}
          onClick={onClaim}
        />
        <ActionButton
          label="Resolve"
          disabled={(!isHolder && !canRetryNotify) || pending}
          onClick={onResolve}
        />
        <ActionButton
          label="Release"
          disabled={!isHolder || pending}
          onClick={onRelease}
        />
      </div>
      <ActionNoticeBanner notice={notice} />
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
