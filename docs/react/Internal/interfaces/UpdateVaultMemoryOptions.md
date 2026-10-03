# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#239)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#240)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#246)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#249)

Model that produced `embedding`. Set whenever `embedding` is written so
the stored model tag stays in sync with the vector.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#277)

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

Defined in: [src/lib/db/memoryVault/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#300)

Typed memory (PR1) — set/refine the fact's classification on update.
Used by retain()'s lazy backfill (adopt an incoming type only when the
existing row has none). Omit to leave the existing value untouched.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#244)

If provided, moves the memory to this folder.

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#293)

C3: Unix ms to stamp as the re-observation watermark (`last_observed_at`).
Set by retain() merge/consolidate paths so a re-observation records "seen
again now" without touching `updated_at` (which `preserveUpdatedAt` keeps
pinned). Omit to leave the existing value untouched.

***

### observationSourceIds?

> `optional` **observationSourceIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#268)

Source ids for an observation. Unioned inside the writer. A replay whose
ids are all already on the row contributes no new evidence, so
`proofCount`/`proofCountIncrement` and [lastObservedAt](#lastobservedat) are skipped —
but the write still lands: `content`, `embedding`, `restore`, `eventTime`
and the rest apply, because a consolidation rewrite legitimately carries
the same source ids as the observation that triggered it.
Omit for unkeyed/manual observations.

***

### preserveUpdatedAt?

> `optional` **preserveUpdatedAt**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#288)

When true, restore the existing `updated_at` after the write so the
recency multiplier doesn't see a re-observation as a brand-new fact.
Set by auto-merge/consolidate paths — they want proof\_count to bump
without inflating recency on top.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#255)

Set an absolute proof count. Prefer [proofCountIncrement](#proofcountincrement) for
re-observation paths so the read+write happens inside the writer
and concurrent retains can't lose updates.

***

### proofCountIncrement?

> `optional` **proofCountIncrement**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:260](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#260)

Atomically bump proof\_count by this delta inside the write block.
Reads the current value from the in-memory record at write time, so
two parallel retain() calls observe each other's commits and neither
loses its increment. Wins over `proofCount` when both are set.

***

### restore?

> `optional` **restore**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#311)

PR5 — un-archive on re-observe. When true, clears `archived_at` (null) as
part of the write, resurrecting a decayed row that a new observation just
merged into. retain() sets this (with `preserveUpdatedAt` OFF) so the
restored row's decay clock resets and it doesn't immediately re-archive.
Omit/false to leave `archived_at` untouched.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#242)

If provided, updates the memory's scope.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#270)

Set source ("manual" | "auto-extracted" | "capsule").

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#251)

Replace source-chunk-ids list (used during merge to accumulate provenance).

***

### topicsUserManaged?

> `optional` **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:296](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#296)

If provided, sets whether the user has taken manual control of this
memory's topics. Set by [setMemoryEntitiesOp](../functions/setMemoryEntitiesOp.md).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#303)

Tier-0 security (PR3) — set the trust tier on update ("quarantined" |
"trusted"). Omit to leave the existing value untouched.
