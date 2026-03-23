# Proposal: Add `since` timestamp filter to vault memory query operations

## Problem

The text server's `GET /api/memories/sync` endpoint supports incremental sync via `?since=<ISO timestamp>`, allowing clients to fetch only memories created or updated after their last sync. However, the SDK's `getAllVaultMemoriesOp` has no timestamp filter — it always loads **all** memories for a user, and the text server filters in JavaScript after the fact.

This means every sync request:
1. Queries the full `memory_vault` table (filtered only by `user_id` and `is_deleted`)
2. Deserializes and potentially decrypts every record
3. Loads all results into Node.js memory
4. Filters by `updatedAt` in JS, discarding most of the data

For a user with 1,000 memories where only 2 are new, we load 1,000 records to return 2.

## Proposed Change

Add an optional `since` parameter to `getAllVaultMemoriesOp` (and optionally `getAllVaultMemoryContentsOp`) that pushes the timestamp filter down to the WatermelonDB query layer.

**This is a purely additive change. No existing APIs are modified or removed. All current call sites continue to work unchanged.**

## Implementation Details

### 1. Update `getAllVaultMemoriesOp` options

**File:** `src/lib/db/memoryVault/operations.ts`

The function already accepts an optional `options` parameter:

```typescript
// CURRENT
export async function getAllVaultMemoriesOp(
  ctx: VaultMemoryOperationsContext,
  options?: { scopes?: string[] }
): Promise<StoredVaultMemory[]>
```

Extend the options type to include `since`:

```typescript
// PROPOSED
export async function getAllVaultMemoriesOp(
  ctx: VaultMemoryOperationsContext,
  options?: {
    scopes?: string[];
    since?: Date;   // Only return memories with updated_at > since
    limit?: number; // Cap the number of results returned
  }
): Promise<StoredVaultMemory[]>
```

### 2. Add query conditions

In the query builder (currently around lines 148-155), add the `since` and `limit` clauses:

```typescript
// CURRENT query conditions:
const conditions = [
  Q.where("is_deleted", false),
  ...(options?.scopes?.length
    ? [Q.where("scope", Q.oneOf(options.scopes))]
    : []),
  ...(ctx.userId !== undefined
    ? [Q.where("user_id", ctx.userId)]
    : []),
  Q.sortBy("created_at", Q.desc),
];

// PROPOSED — add since + limit:
const conditions = [
  Q.where("is_deleted", false),
  ...(options?.scopes?.length
    ? [Q.where("scope", Q.oneOf(options.scopes))]
    : []),
  ...(ctx.userId !== undefined
    ? [Q.where("user_id", ctx.userId)]
    : []),
  ...(options?.since
    ? [Q.where("updated_at", Q.gt(options.since.getTime()))]
    : []),
  Q.sortBy("created_at", Q.desc),
  ...(options?.limit ? [Q.take(options.limit)] : []),
];
```

**Notes:**
- `updated_at` is stored as a number (epoch ms) in WatermelonDB, so `since.getTime()` converts the Date to the correct format.
- `Q.gt()` (greater than) ensures we only get records updated *after* the given timestamp.
- `Q.take(n)` limits the result set at the query level.
- The `updated_at` column should be indexed for performance (see schema change below).

### 3. Add index on `updated_at`

**File:** `src/lib/db/schema.ts`

The `updated_at` column is currently **not indexed**. For the `since` filter to be efficient, add an index.

In the schema (currently at version 19), bump to version 20 and add a migration:

```typescript
// In the schema tableSchema for memory_vault, change:
{ name: "updated_at", type: "number" },
// to:
{ name: "updated_at", type: "number", isIndexed: true },
```

And add a migration step from v19 → v20:

```typescript
{
  toVersion: 20,
  steps: [
    addIndex({
      table: "memory_vault",
      columns: ["updated_at"],
    }),
  ],
}
```

### 4. Optionally update `getAllVaultMemoryContentsOp`

The text server's POST /sync dedup also calls `getAllVaultMemoryContentsOp` which loads all content strings. This function could benefit from the same `since` filter, but it's lower priority since POST /sync is currently behind a feature flag.

```typescript
// CURRENT
export async function getAllVaultMemoryContentsOp(
  ctx: VaultMemoryOperationsContext
): Promise<string[]>

// PROPOSED (optional)
export async function getAllVaultMemoryContentsOp(
  ctx: VaultMemoryOperationsContext,
  options?: { since?: Date }
): Promise<string[]>
```

## What does NOT change

- **Function signatures are backward-compatible** — all new parameters are optional with `?`
- **Existing callers pass no options** — they continue to get all memories (same behavior as today)
- **Return types are unchanged** — still `Promise<StoredVaultMemory[]>` and `Promise<string[]>`
- **Sort order is unchanged** — still `created_at DESC`
- **Encryption/decryption logic is unchanged** — `vaultMemoryToStored()` still handles content decryption
- **userId scoping is unchanged** — `ctx.userId` filtering is independent of `since`
- **Bounded concurrency is unchanged** — the 50-record batch processing still applies to returned results
- **No changes to create, update, or delete operations**
- **No changes to the search tool or embedding operations**
- **No changes to the React hooks or client-side code**

## Text server adoption

Once this ships, the text server's `GET /api/memories/sync` handler changes from:

```typescript
// CURRENT — loads all, filters in JS
const allMemories = await getAllVaultMemoriesOp(vaultCtx);
let filtered = allMemories;
if (query.since) {
  const since = new Date(query.since);
  filtered = allMemories.filter((m) => m.updatedAt > since);
}
const page = filtered.slice(0, limit);
```

To:

```typescript
// PROPOSED — filter at DB level
const memories = await getAllVaultMemoriesOp(vaultCtx, {
  since: query.since ? new Date(query.since) : undefined,
  limit,
});
```

The text server's API contract (`?since=`, `?limit=`, response shape) stays exactly the same — only the internal implementation becomes more efficient.

## Testing

Add tests in `src/lib/db/memoryVault/operations.test.ts`:

1. **`since` filter returns only newer memories** — create 3 memories at different times, query with `since` set between them, verify only the newer ones are returned
2. **`since` with no matching results returns empty array** — set `since` to the future, verify empty result
3. **`since` omitted returns all memories** — existing behavior, verify not broken
4. **`since` combined with `scopes`** — both filters applied together
5. **`since` combined with `userId`** — scoping + timestamp filter
6. **`limit` caps results** — create 10 memories, query with `limit: 3`, verify 3 returned
7. **`limit` combined with `since`** — both applied together

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| API signature | `options?: { scopes? }` | `options?: { scopes?, since?, limit? }` |
| Breaking changes | — | None |
| DB query for incremental sync | Full table scan + JS filter | Indexed `WHERE updated_at > ?` |
| Memory usage (1000 memories, 2 new) | Load 1000, return 2 | Load 2, return 2 |
| Schema version | 19 | 20 (adds `updated_at` index) |
| Files changed | 2 (`operations.ts`, `schema.ts`) | + tests |
