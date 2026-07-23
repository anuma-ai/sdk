# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#100)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#101)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#107)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#110)

Model that produced `embedding`. Set whenever `embedding` is written so
the stored model tag stays in sync with the vector.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#130)

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

### factType?

> `optional` **factType**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/db/memoryVault/types.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#153)

Typed memory (PR1) — set/refine the fact's classification on update.
Used by retain()'s lazy backfill (adopt an incoming type only when the
existing row has none). Omit to leave the existing value untouched.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#105)

If provided, moves the memory to this folder.

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#146)

C3: Unix ms to stamp as the re-observation watermark (`last_observed_at`).
Set by retain() merge/consolidate paths so a re-observation records "seen
again now" without touching `updated_at` (which `preserveUpdatedAt` keeps
pinned). Omit to leave the existing value untouched.

***

### preserveUpdatedAt?

> `optional` **preserveUpdatedAt**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#141)

When true, restore the existing `updated_at` after the write so the
recency multiplier doesn't see a re-observation as a brand-new fact.
Set by auto-merge/consolidate paths — they want proof\_count to bump
without inflating recency on top.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#116)

Set an absolute proof count. Prefer [proofCountIncrement](#proofcountincrement) for
re-observation paths so the read+write happens inside the writer
and concurrent retains can't lose updates.

***

### proofCountIncrement?

> `optional` **proofCountIncrement**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#121)

Atomically bump proof\_count by this delta inside the write block.
Reads the current value from the in-memory record at write time, so
two parallel retain() calls observe each other's commits and neither
loses its increment. Wins over `proofCount` when both are set.

***

### restore?

> `optional` **restore**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#164)

PR5 — un-archive on re-observe. When true, clears `archived_at` (null) as
part of the write, resurrecting a decayed row that a new observation just
merged into. retain() sets this (with `preserveUpdatedAt` OFF) so the
restored row's decay clock resets and it doesn't immediately re-archive.
Omit/false to leave `archived_at` untouched.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#103)

If provided, updates the memory's scope.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#123)

Set source ("manual" | "auto-extracted" | "capsule").

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#112)

Replace source-chunk-ids list (used during merge to accumulate provenance).

***

### topicsUserManaged?

> `optional` **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#149)

If provided, sets whether the user has taken manual control of this
memory's topics. Set by [setMemoryEntitiesOp](../functions/setMemoryEntitiesOp.md).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#156)

Tier-0 security (PR3) — set the trust tier on update ("quarantined" |
"trusted"). Omit to leave the existing value untouched.
