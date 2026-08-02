/** Shared shapes for claim / resolve / release + outbox poll responses. */

export type ItemSnapshot = {
  status?: "open" | "claimed" | "resolved";
  claimedById?: string | null;
  claimedByName?: string | null;
};

export type NotifySnapshot = {
  outboxId: string;
  status: "pending" | "delivered" | "failed";
  message?: string;
  attempts?: number;
  lastError?: string | null;
};

export type ActionApiBody = {
  ok?: boolean;
  outcome?: string;
  message?: string;
  error?: string;
  item?: ItemSnapshot;
  holder?: { id: string; name: string | null } | null;
  notify?: NotifySnapshot;
};

export type OutboxApiBody = {
  ok?: boolean;
  message?: string;
  error?: string;
  notify?: {
    status: "pending" | "delivered" | "failed";
    attempts: number;
    lastError: string | null;
  };
};
