# R4 — Stable pagination

## Approach

**Keyset (seek)** on `(createdAt DESC, id DESC)`. The client passes `after=<lastItemId>`; the server loads that row’s `(createdAt, id)` and requests the next older page:

```sql
WHERE workspaceId = $ws
  AND (
    "createdAt" < $c
    OR ("createdAt" = $c AND id < $id)
  )
ORDER BY "createdAt" DESC, id DESC
LIMIT $take
```

Index: `Item_workspaceId_createdAt_id_idx` (`@@index([workspaceId, createdAt, id])`).

Rejected for the moving queue: **OFFSET/LIMIT** (head inserts shift the window → duplicate or skip boundary rows) and **fetch-all ~10k** (wasteful once filters grow).

## Failure mode

Keyset does **not** replay rows you already passed. Items inserted **newer than the current cursor** (at the head of the queue) will not appear in later “Load more” pages — only after a fresh first page / refresh. That is the trade-off for no duplicates while scrolling older.

If the `after` item was deleted or is in another workspace → `404 not_found` (UI shows the load error).

Status churn (claim/resolve) does not move `(createdAt, id)`, so identity across pages stays stable.

## EXPLAIN ANALYZE

Captured on local `prisma dev` Postgres against seeded `ws_flamingo` (**10 000** items). Deep page ≈ offset **9000** / keyset after the 9000th newest row.

### Naive — `OFFSET 9000 LIMIT 50`

```text
Limit  (cost=310.32..310.32 rows=1 width=40) (actual time=12.002..12.026 rows=50 loops=1)
  Buffers: shared hit=838
  ->  Sort  (cost=310.03..310.32 rows=116 width=40) (actual time=8.805..10.240 rows=9050 loops=1)
        Sort Key: "createdAt" DESC, id DESC
        Sort Method: quicksort  Memory: 890kB
        Buffers: shared hit=838
        ->  Bitmap Heap Scan on "Item"  (cost=9.31..306.05 rows=116 width=40) (actual time=1.644..4.261 rows=10000 loops=1)
              Recheck Cond: ("workspaceId" = 'ws_flamingo'::text)
              Heap Blocks: exact=479
              Buffers: shared hit=838
              ->  Bitmap Index Scan on "Item_workspaceId_status_createdAt_id_idx"  (cost=0.00..9.28 rows=116 width=0) (actual time=1.264..1.265 rows=25860 loops=1)
                    Index Cond: ("workspaceId" = 'ws_flamingo'::text)
                    Buffers: shared hit=359
Planning Time: 1.039 ms
Execution Time: 12.170 ms
```

Reads the workspace, sorts, and materializes **9050** rows to skip 9000.

### Ours — keyset after the same anchor `LIMIT 50`

```text
Limit  (cost=134.97..135.07 rows=39 width=40) (actual time=2.149..2.173 rows=50 loops=1)
  Buffers: shared hit=711
  ->  Sort  (cost=134.97..135.07 rows=39 width=40) (actual time=2.139..2.149 rows=50 loops=1)
        Sort Key: "createdAt" DESC, id DESC
        Sort Method: top-N heapsort  Memory: 24kB
        Buffers: shared hit=711
        ->  Bitmap Heap Scan on "Item"  (cost=9.25..133.94 rows=39 width=40) (actual time=1.544..1.795 rows=1000 loops=1)
              Recheck Cond: ((("workspaceId" = 'ws_flamingo'::text) AND ("createdAt" < …)) OR (… AND id < …))
              Heap Blocks: exact=484
              Buffers: shared hit=711
              ->  BitmapOr  (cost=9.25..9.25 rows=39 width=0) (actual time=1.087..1.088 rows=0 loops=1)
                    Buffers: shared hit=227
                    ->  Bitmap Index Scan on "Item_workspaceId_createdAt_id_idx"  (cost=0.00..4.80 rows=39 width=0) (actual time=1.079..1.079 rows=30859 loops=1)
                          Index Cond: (("workspaceId" = 'ws_flamingo'::text) AND ("createdAt" < …))
                          Buffers: shared hit=224
                    ->  Bitmap Index Scan on "Item_workspaceId_createdAt_id_idx"  (cost=0.00..4.42 rows=1 width=0) (actual time=0.005..0.005 rows=0 loops=1)
                          Index Cond: (("workspaceId" = 'ws_flamingo'::text) AND ("createdAt" = …) AND (id < …))
                          Buffers: shared hit=3
Planning Time: 2.368 ms
Execution Time: 2.362 ms
```

Seeks via `(workspaceId, createdAt, id)`; top-N over the older slice (~**1000** heap rows here) instead of skipping 9000. ~**5×** faster on this deep page (`12.2ms` → `2.4ms`). At larger offsets / bigger tables the OFFSET cost keeps climbing; keyset stays near page-sized work.

## Tests

`tests/domain/r4-keyset.test.ts` — no duplicate ids when newer rows insert between pages; OFFSET under the same churn *does* duplicate; claim/resolve mid-queue does not break keyset identity.
