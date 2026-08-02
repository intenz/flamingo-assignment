"use client";

import type {
  QueueActionNotice,
  QueueNoticeTone,
} from "@/lib/triage/queue/queue-types";

const DOT_CLASS: Record<QueueNoticeTone, string> = {
  pending: "border-muted border-t-transparent",
  delivered: "border-success bg-success",
  failed: "border-danger bg-danger",
  warning: "border-warning bg-warning",
};

type Props = {
  canClaim: boolean;
  isHolder: boolean;
  /** Resolved item with pending/failed notify — Resolve retries delivery. */
  canRetryNotify: boolean;
  pending: boolean;
  notice: QueueActionNotice | null;
  onClaim: () => void;
  onResolve: () => void;
  onRelease: () => void;
};

export function QueueActionButtons({
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
    <div className="flex flex-wrap gap-1" aria-busy={pending || undefined}>
      <ActionButton
        label="Claim"
        disabled={!canClaim || pending}
        onClick={onClaim}
      />
      <span className="relative inline-flex">
        <ResolveNoticeDot notice={notice} />
        <ActionButton
          label="Resolve"
          title={notice?.text}
          disabled={(!isHolder && !canRetryNotify) || pending}
          onClick={onResolve}
        />
      </span>
      <ActionButton
        label="Release"
        disabled={!isHolder || pending}
        onClick={onRelease}
      />
    </div>
  );
}

function ActionButton({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string;
  title?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function ResolveNoticeDot({ notice }: { notice: QueueActionNotice | null }) {
  if (!notice) return null;

  const loading = notice.tone === "pending";

  return (
    <span
      role="status"
      title={notice.text}
      aria-label={notice.text}
      className={[
        "pointer-events-auto absolute right-0 top-0 z-10 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2",
        DOT_CLASS[notice.tone],
        loading ? "animate-spin bg-transparent" : "",
      ].join(" ")}
    />
  );
}
