"use client";

import type { ActionNotice, NoticeTone } from "@/lib/triage/item-row-view";

const TONE_CLASS: Record<NoticeTone, string> = {
  pending: "bg-surface text-muted border border-border",
  delivered: "bg-success-soft text-success",
  failed: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
};

export function ActionNoticeBanner({ notice }: { notice: ActionNotice | null }) {
  if (!notice) return <div className="min-h-[1.75rem]" />;
  return (
    <div className="min-h-[1.75rem]">
      <p
        role="status"
        className={`max-w-[16rem] rounded-lg px-2 py-1 text-xs ${TONE_CLASS[notice.tone]}`}
      >
        {notice.text}
      </p>
    </div>
  );
}
