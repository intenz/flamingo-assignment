/** Active claims older than this return to `open` (R5). */
export const CLAIM_TTL_MS = 30 * 60 * 1000;

/** Shown when resolve/release hits a claim past the TTL. */
export const CLAIM_EXPIRED_MESSAGE =
  "Claim expired; item returned to the open queue.";
