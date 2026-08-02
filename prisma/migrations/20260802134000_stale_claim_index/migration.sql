-- R5: speed stale-claim sweep (status=claimed AND claimedAt < cutoff)
CREATE INDEX "Item_status_claimedAt_idx" ON "Item"("status", "claimedAt");
