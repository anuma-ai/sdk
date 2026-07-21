# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#72)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#73)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#79)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#82)

Model that produced `embedding`. Set whenever `embedding` is written so
the stored model tag stays in sync with the vector.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#102)

W6 temporal lane — write the event-time fields on update. Use during
auto-merge to preserve (or refine) the original event-time signal when
a new observation lands on an existing fact. Omit to leave the
existing values untouched.

**end**

> **end**: `number` | `null`

**kind**

> **kind**: `"point"` | `"range"` | `"ongoing"` | `null`

**start**

> **start**: `number` | `null`

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#77)

If provided, moves the memory to this folder.

***

### preserveUpdatedAt?

> `optional` **preserveUpdatedAt**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#113)

When true, restore the existing `updated_at` after the write so the
recency multiplier doesn't see a re-observation as a brand-new fact.
Set by auto-merge/consolidate paths — they want proof\_count to bump
without inflating recency on top.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#88)

Set an absolute proof count. Prefer [proofCountIncrement](#proofcountincrement) for
re-observation paths so the read+write happens inside the writer
and concurrent retains can't lose updates.

***

### proofCountIncrement?

> `optional` **proofCountIncrement**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#93)

Atomically bump proof\_count by this delta inside the write block.
Reads the current value from the in-memory record at write time, so
two parallel retain() calls observe each other's commits and neither
loses its increment. Wins over `proofCount` when both are set.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#75)

If provided, updates the memory's scope.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#95)

Set source ("manual" | "auto-extracted" | "capsule").

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#84)

Replace source-chunk-ids list (used during merge to accumulate provenance).

***

### topicsUserManaged?

> `optional` **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#116)

If provided, sets whether the user has taken manual control of this
memory's topics. Set by [setMemoryEntitiesOp](../functions/setMemoryEntitiesOp.md).
