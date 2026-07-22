# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#84)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#85)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#91)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#94)

Model that produced `embedding`. Set whenever `embedding` is written so
the stored model tag stays in sync with the vector.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#114)

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

Defined in: [src/lib/db/memoryVault/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#89)

If provided, moves the memory to this folder.

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#130)

C3: Unix ms to stamp as the re-observation watermark (`last_observed_at`).
Set by retain() merge/consolidate paths so a re-observation records "seen
again now" without touching `updated_at` (which `preserveUpdatedAt` keeps
pinned). Omit to leave the existing value untouched.

***

### preserveUpdatedAt?

> `optional` **preserveUpdatedAt**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#125)

When true, restore the existing `updated_at` after the write so the
recency multiplier doesn't see a re-observation as a brand-new fact.
Set by auto-merge/consolidate paths — they want proof\_count to bump
without inflating recency on top.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#100)

Set an absolute proof count. Prefer [proofCountIncrement](#proofcountincrement) for
re-observation paths so the read+write happens inside the writer
and concurrent retains can't lose updates.

***

### proofCountIncrement?

> `optional` **proofCountIncrement**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#105)

Atomically bump proof\_count by this delta inside the write block.
Reads the current value from the in-memory record at write time, so
two parallel retain() calls observe each other's commits and neither
loses its increment. Wins over `proofCount` when both are set.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#87)

If provided, updates the memory's scope.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#107)

Set source ("manual" | "auto-extracted" | "capsule").

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#96)

Replace source-chunk-ids list (used during merge to accumulate provenance).

***

### topicsUserManaged?

> `optional` **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#133)

If provided, sets whether the user has taken manual control of this
memory's topics. Set by [setMemoryEntitiesOp](../functions/setMemoryEntitiesOp.md).
