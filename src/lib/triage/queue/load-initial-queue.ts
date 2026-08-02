import type { Role } from "@/generated/prisma/client";
import { roleCanMutate } from "@/lib/auth/membership";
import {
  QUEUE_PAGE_SIZE,
  listQueue,
  type QueuePage,
} from "@/lib/triage/queue/queue";

const EMPTY_QUEUE_PAGE: QueuePage = { items: [], nextAfterId: null };

/** Minimal viewer shape needed to decide ACL + first queue page. */
export type QueueViewer = {
  id: string;
  role: Role | null;
  workspaceId: string | null;
};

export type QueueInitialState = {
  hasWorkspaceMembership: boolean;
  canMutate: boolean;
  viewerId: string | null;
  page: QueuePage;
};

/**
 * First keyset page + ACL flags for the triage home RSC.
 * Returns an empty page when signed out or without workspace membership.
 */
export async function loadInitialQueueForSession(
  viewer: QueueViewer | null,
): Promise<QueueInitialState> {
  const workspaceId = viewer?.workspaceId ?? null;
  const viewerId = viewer?.id ?? null;
  const hasWorkspaceMembership = Boolean(workspaceId && viewerId);
  const canMutate = Boolean(viewer?.role && roleCanMutate(viewer.role));

  const page =
    workspaceId && viewerId
      ? await listQueue(workspaceId, viewerId, {
          take: QUEUE_PAGE_SIZE,
        })
      : EMPTY_QUEUE_PAGE;

  return { hasWorkspaceMembership, canMutate, viewerId, page };
}
