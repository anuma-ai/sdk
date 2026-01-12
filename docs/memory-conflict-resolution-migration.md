# Memory System v2: Conflict Resolution Migration Guide

This guide explains how to update client applications to use the new memory system with automatic conflict resolution, superseding, and access tracking.

## Overview of Changes

### What's New in v2

1. **Automatic Conflict Resolution**: When saving a memory with the same `namespace:key` but different `value`, the old memory is automatically superseded (soft-deleted) and the new one references it.

2. **New Fields on `StoredMemory`**:
   - `accessedAt: Date` - When the memory was last accessed
   - `supersedes?: string` - ID of the memory this one replaced
   - `previousValue?: string` - The old value that was replaced

3. **New Return Type**: `saveMemory()` and `saveMemories()` now return `SaveMemoryResult` instead of `StoredMemory`:
   ```typescript
   type SaveMemoryResult = {
     memory: StoredMemory;
     action: "created" | "updated" | "superseded";
     supersededMemory?: StoredMemory;
   };
   ```

4. **New Methods**:
   - `getMemoryHistory(id)` - Get all versions of a memory
   - `getSupersededMemories()` - Get all historical (replaced) memories
   - `touchMemory(id)` - Update the `accessedAt` timestamp

5. **Database Migration**: Schema version bumped from 1 to 2 with migration support.

---

## Migration Steps

### Step 1: Update Database Initialization

If you're creating the WatermelonDB database manually, add the migrations:

```typescript
// Before
import { memoryStorageSchema } from '@reverbia/sdk';

const database = new Database({
  adapter,
  schema: memoryStorageSchema,
});

// After
import { memoryStorageSchema, memoryStorageMigrations } from '@reverbia/sdk';

const database = new Database({
  adapter,
  schema: memoryStorageSchema,
  migrations: memoryStorageMigrations, // Add this line
});
```

### Step 2: Update `saveMemory()` Calls

The return type changed from `StoredMemory` to `SaveMemoryResult`.

```typescript
// Before
const savedMemory = await saveMemory({
  type: "preference",
  namespace: "work",
  key: "employer",
  value: "Google",
  rawEvidence: "User said they work at Google",
  confidence: 0.9,
  pii: false,
});
console.log(`Saved: ${savedMemory.value}`);

// After
const result = await saveMemory({
  type: "preference",
  namespace: "work",
  key: "employer",
  value: "Meta", // Changed from Google to Meta
  rawEvidence: "User said they now work at Meta",
  confidence: 0.95,
  pii: false,
});

// Handle the result based on action taken
switch (result.action) {
  case "created":
    console.log(`New memory created: ${result.memory.value}`);
    break;
  case "updated":
    console.log(`Memory updated: ${result.memory.value}`);
    break;
  case "superseded":
    console.log(`Memory superseded: ${result.supersededMemory?.value} → ${result.memory.value}`);
    // The old memory (Google) is now soft-deleted
    // The new memory (Meta) has supersedes pointing to the old one
    break;
}

// If you just need the memory (backwards-compatible pattern):
const memory = result.memory;
```

### Step 3: Update `saveMemories()` Calls

```typescript
// Before
const savedMemories: StoredMemory[] = await saveMemories(memoriesToSave);

// After
const results: SaveMemoryResult[] = await saveMemories(memoriesToSave);

// Extract just the memories if needed
const memories = results.map(r => r.memory);

// Or check for superseded memories
const supersededCount = results.filter(r => r.action === "superseded").length;
if (supersededCount > 0) {
  console.log(`${supersededCount} memories were updated with new values`);
}
```

### Step 4: Use New Methods (Optional)

#### Get Memory History

View all versions of a fact that has changed over time:

```typescript
// Get the history of a memory (follows the supersedes chain)
const history = await getMemoryHistory(currentMemory.uniqueId);

// history[0] is the current version
// history[1] is the previous version (if any)
// history[n] is the oldest version

for (const version of history) {
  console.log(`Value: ${version.value}, Created: ${version.createdAt}`);
  if (version.previousValue) {
    console.log(`  (replaced: ${version.previousValue})`);
  }
}
```

#### Get All Superseded Memories

View audit trail of all memory changes:

```typescript
const supersededMemories = await getSupersededMemories();
console.log(`Total historical memories: ${supersededMemories.length}`);
```

#### Track Memory Access

Update `accessedAt` when a memory is used:

```typescript
// When you use a memory in your app, touch it to track access
await touchMemory(memory.uniqueId);

// This enables future features like:
// - Decay/aging of unused memories
// - Most-recently-used sorting
// - Cleanup of stale memories
```

### Step 5: Update TypeScript Types (if needed)

If you're importing types directly:

```typescript
// New type to import
import type { SaveMemoryResult } from '@reverbia/sdk';

// Updated function signatures
async function handleSave(): Promise<void> {
  const result: SaveMemoryResult = await saveMemory(/* ... */);
  // ...
}
```

---

## Behavior Examples

### Example 1: First-time Save (action: "created")

```typescript
// No existing memory for work:employer
const result = await saveMemory({
  namespace: "work",
  key: "employer",
  value: "Google",
  // ...
});
// result.action === "created"
// result.memory.supersedes === undefined
```

### Example 2: Same Value Save (action: "updated")

```typescript
// Memory already exists with value "Google"
const result = await saveMemory({
  namespace: "work",
  key: "employer",
  value: "Google", // Same value
  rawEvidence: "New evidence", // But updated evidence
  confidence: 0.99, // And confidence
});
// result.action === "updated"
// The existing memory is updated in place
```

### Example 3: Different Value Save (action: "superseded")

```typescript
// Memory exists with value "Google"
const result = await saveMemory({
  namespace: "work",
  key: "employer",
  value: "Meta", // Different value!
  rawEvidence: "User said they now work at Meta",
});
// result.action === "superseded"
// result.memory.value === "Meta"
// result.memory.supersedes === "<old-memory-id>"
// result.memory.previousValue === "Google"
// result.supersededMemory.value === "Google"
// result.supersededMemory.isDeleted === true
```

---

## Common Patterns

### Pattern: Backwards-Compatible Wrapper

If you want to maintain the old API in your app:

```typescript
async function saveMemoryCompat(memory: CreateMemoryOptions): Promise<StoredMemory> {
  const result = await saveMemory(memory);
  return result.memory;
}
```

### Pattern: Logging Superseded Changes

```typescript
const result = await saveMemory(newMemory);
if (result.action === "superseded") {
  // Log to analytics or audit system
  logMemoryChange({
    key: result.memory.compositeKey,
    oldValue: result.supersededMemory?.value,
    newValue: result.memory.value,
    timestamp: new Date(),
  });
}
```

### Pattern: Undo Last Change

```typescript
async function undoLastChange(memoryId: string): Promise<StoredMemory | null> {
  const history = await getMemoryHistory(memoryId);
  if (history.length < 2) return null; // No previous version

  const [current, previous] = history;

  // Re-save with previous value (this will supersede current)
  const result = await saveMemory({
    ...previous,
    rawEvidence: `Reverted from: ${current.value}`,
  });

  return result.memory;
}
```

---

## FAQ

**Q: Will existing memories still work?**
A: Yes. The migration adds new columns with default values. Existing memories will have `accessedAt` default to `createdAt`, and `supersedes`/`previousValue` will be undefined.

**Q: Is this a breaking change?**
A: The return type of `saveMemory()` and `saveMemories()` changed, so TypeScript will flag places that need updates. The fix is simple: access `.memory` on the result.

**Q: What happens to superseded memories?**
A: They are soft-deleted (`isDeleted: true`) but remain in the database. They won't appear in normal queries but can be retrieved via `getMemoryHistory()` or `getSupersededMemories()`.

**Q: Can I disable conflict resolution?**
A: No. The new behavior is always active. If you want to store multiple values for the same key, use different namespaces or append timestamps to keys.
