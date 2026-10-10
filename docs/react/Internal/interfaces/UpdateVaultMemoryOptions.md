# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:333](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#333)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#334)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:351](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#351)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:354](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#354)

Model that produced `embedding`. Set whenever `embedding` is written so
the stored model tag stays in sync with the vector.

***

### eventTime?

> `optional` **eventTime**: `object`

Defined in: [src/lib/db/memoryVault/types.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#382)

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

Defined in: [src/lib/db/memoryVault/types.ts:405](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#405)

Typed memory (PR1) — set/refine the fact's classification on update.
Used by retain()'s lazy backfill (adopt an incoming type only when the
existing row has none). Omit to leave the existing value untouched.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:349](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#349)

If provided, moves the memory to this folder.

***

### freeFormOnly?

> `optional` **freeFormOnly**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:336](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#336)

When true, the write is skipped (returns null) if the row carries a profile kind.

***

### kind?

> `optional` **kind**: `"prompt"` | `"display_name"` | `"occupation"` | `"birth_date"` | `"bio"` | `"interest"` | `"gender"` | `"height_cm"` | `"looking_for"` | `"politics"` | `"religion"` | `"ethnicity"` | `"smoking"` | `"drinking"` | `"exercise"` | `"sexuality"` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:343](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#343)

If provided, sets the profile kind (null makes the memory free-form).

***

### kindValue?

> `optional` **kindValue**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:345](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#345)

If provided, sets the canonical JSON value (null clears it).

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:398](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#398)

C3: Unix ms to stamp as the re-observation watermark (`last_observed_at`).
Set by retain() merge/consolidate paths so a re-observation records "seen
again now" without touching `updated_at` (which `preserveUpdatedAt` keeps
pinned). Omit to leave the existing value untouched.

***

### level?

> `optional` **level**: `"profile"` | `"private"` | `"matching"`

Defined in: [src/lib/db/memoryVault/types.ts:347](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#347)

If provided, sets the level (and dual-writes `scope`).

***

### observationSourceIds?

> `optional` **observationSourceIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:373](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#373)

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

Defined in: [src/lib/db/memoryVault/types.ts:393](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#393)

When true, restore the existing `updated_at` after the write so the
recency multiplier doesn't see a re-observation as a brand-new fact.
Set by auto-merge/consolidate paths — they want proof\_count to bump
without inflating recency on top.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#360)

Set an absolute proof count. Prefer [proofCountIncrement](#proofcountincrement) for
re-observation paths so the read+write happens inside the writer
and concurrent retains can't lose updates.

***

### proofCountIncrement?

> `optional` **proofCountIncrement**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#365)

Atomically bump proof\_count by this delta inside the write block.
Reads the current value from the in-memory record at write time, so
two parallel retain() calls observe each other's commits and neither
loses its increment. Wins over `proofCount` when both are set.

***

### restore?

> `optional` **restore**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:416](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#416)

PR5 — un-archive on re-observe. When true, clears `archived_at` (null) as
part of the write, resurrecting a decayed row that a new observation just
merged into. retain() sets this (with `preserveUpdatedAt` OFF) so the
restored row's decay clock resets and it doesn't immediately re-archive.
Omit/false to leave `archived_at` untouched.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:341](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#341)

If provided, updates the memory's scope (and the level it implies; a `profile` row keeps
`profile` under `scope: "shared"`).

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:375](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#375)

Set source ("manual" | "auto-extracted" | "capsule").

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#356)

Replace source-chunk-ids list (used during merge to accumulate provenance).

***

### topicsUserManaged?

> `optional` **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:401](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#401)

If provided, sets whether the user has taken manual control of this
memory's topics. Set by [setMemoryEntitiesOp](../functions/setMemoryEntitiesOp.md).

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:408](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#408)

Tier-0 security (PR3) — set the trust tier on update ("quarantined" |
"trusted"). Omit to leave the existing value untouched.
