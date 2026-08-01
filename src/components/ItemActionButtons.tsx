"use client";

type Props = {
  canClaim: boolean;
  isHolder: boolean;
  pending: boolean;
  notice: string | null;
  onClaim: () => void;
  onResolve: () => void;
  onRelease: () => void;
};

export function ItemActionButtons({
  canClaim,
  isHolder,
  pending,
  notice,
  onClaim,
  onResolve,
  onRelease,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        <ActionButton
          label="Claim"
          disabled={!canClaim || pending}
          onClick={onClaim}
        />
        <ActionButton
          label="Resolve"
          disabled={!isHolder || pending}
          onClick={onResolve}
        />
        <ActionButton
          label="Release"
          disabled={!isHolder || pending}
          onClick={onRelease}
        />
        {pending ? (
          <span className="self-center text-xs text-muted">…</span>
        ) : null}
      </div>
      {notice ? (
        <p
          role="status"
          className="max-w-[16rem] rounded-lg bg-warning-soft px-2 py-1 text-xs text-warning"
        >
          {notice}
        </p>
      ) : null}
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
