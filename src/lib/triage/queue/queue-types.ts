/** Shared queue types — statuses + list/UI/API shapes (no Prisma). */

/** Mirrors Prisma `ItemStatus` — keep free of generated client for browser imports. */
export type QueueItemStatus = "open" | "claimed" | "resolved";

/** Mirrors Prisma `NotifyOutboxStatus`. */
export type QueueNotifyStatus = "pending" | "delivered" | "failed";

/** Latest outbox for UI hydrate after refresh (null if none / already sent). */
export type QueueItemNotify = {
  outboxId: string;
  status: QueueNotifyStatus;
  attempts: number;
  lastError: string | null;
};

export type QueueItemRow = {
  id: string;
  title: string;
  status: QueueItemStatus;
  claimedById: string | null;
  claimedByName: string | null;
  /** When status is claimed — used for R5 “past TTL” display hint (server remains source of truth). */
  claimedAt: Date | null;
  createdAt: Date;
  /** Present when notify still needs attention (pending/failed). */
  notify: QueueItemNotify | null;
};

export type QueuePage = {
  items: QueueItemRow[];
  /**
   * Id of the last row on this page — pass as `after` for the next older page.
   * Null when there are no more older items.
   */
  nextAfterId: string | null;
};

/** Client row patch after claim / resolve / release (subset of list row). */
export type QueueItemRowState = {
  status: QueueItemStatus;
  claimedById: string | null;
  claimedByName: string | null;
  claimedAt: Date | null;
};

export type QueueItemAction = "claim" | "resolve" | "release";

export type QueueNoticeTone = QueueNotifyStatus | "warning";

export type QueueActionNotice = {
  text: string;
  tone: QueueNoticeTone;
};

export type QueueItemSnapshot = {
  status?: QueueItemStatus;
  claimedById?: string | null;
  claimedByName?: string | null;
};

export type QueueNotifySnapshot = {
  outboxId: string;
  status: QueueNotifyStatus;
  message?: string;
  attempts?: number;
  lastError?: string | null;
};

/** Poll / hydrate notify banner (no outboxId when already known by the client). */
export type QueueOutboxNotifyView = {
  status: QueueNotifyStatus;
  attempts: number;
  lastError: string | null;
};

export type QueueActionApiBody = {
  ok?: boolean;
  outcome?: string;
  message?: string;
  error?: string;
  item?: QueueItemSnapshot;
  holder?: { id: string; name: string | null } | null;
  notify?: QueueNotifySnapshot;
};

export type QueueOutboxApiBody = {
  ok?: boolean;
  message?: string;
  error?: string;
  notify?: QueueOutboxNotifyView;
};
