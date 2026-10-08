# StoredVaultMemory

Defined in: [src/lib/db/memoryVault/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#107)

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#185)

Decay archive state (PR2) — Unix ms when archived, or null when active.

***

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#111)

Plain text memory content

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#197)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#125)

JSON-stringified embedding vector, null if not yet computed

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#128)

Model that produced `embedding`. Null on legacy rows (grandfathered as
compatible with the current model).

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#146)

W6 temporal lane — Unix ms when the event ended (range only).

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#148)

W6 temporal lane — `point | range | ongoing | null`.

***

### eventTimeStart

> **eventTimeStart**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#144)

W6 temporal lane — Unix ms when the event occurred (point/start of range).

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#183)

Typed memory (PR1) — the extractor's FactType for this fact, or null on
legacy/manual/untyped rows. Plaintext string (not narrowed to FactType
here since the DB can hold any stored value).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#121)

Folder ID for organization, null if unfiled

***

### geohash

> **geohash**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#196)

Reserved coarse-geohash slot for landmark/Trail memories.

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#199)

***

### kind?

> `optional` **kind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#115)

Profile kind ([MEMORY\_KINDS](../variables/MEMORY_KINDS.md)) or null for a free-form memory.

***

### kindValue?

> `optional` **kindValue**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#117)

Canonical value of a kinded memory, JSON-encoded (slug, slug\[], int, date, text).

***

### lastObservedAt

> **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#179)

C3 re-observation watermark: Unix ms of the last retain() merge into this
fact. Distinct from `updatedAt` (which merges preserve). Null = never
re-observed since the column was added; synthesis falls back to
`updatedAt` in that case.

***

### level?

> `optional` **level**: `"profile"` | `"private"` | `"matching"`

Defined in: [src/lib/db/memoryVault/types.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#119)

Who this memory reaches.

***

### media?

> `optional` **media**: [`PhotoMediaRef`](PhotoMediaRef.md)\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#142)

The photo(s) a SERVER-EXTRACTED memory was read out of. Null on every
memory that did not come from a photo. See [PhotoMediaRef](PhotoMediaRef.md).

OPTIONAL rather than required: every read path sets it (the row mappers
always call parseMedia), but making it required would be a compile-break
for any caller that CONSTRUCTS a StoredVaultMemory — fixtures, mocks, and
anything downstream — for a field that is null on all but photo rows.

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#132)

Times this fact has been re-observed (for ranking + UX badges).

***

### publishedAt

> **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#194)

Unix ms when visibility last became non-private; null while private.

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#113)

Scope for partitioning memories (e.g., "private", "shared").

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#134)

How the memory was created: manual | auto-extracted | capsule | photo.

***

### sourceChunkIds

> **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#130)

JSON-stringified array of source message IDs this fact was extracted from.

***

### supersededAt

> **supersededAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#170)

Unix ms when this memory was superseded. Null when live.

***

### supersededBy

> **supersededBy**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#168)

Write-time supersession (A2): id of the newer memory that replaced this
one (incompatible-value update, e.g. "Lives in Portland" → "Lives in SF").
Null = live. Superseded rows are excluded from recall/dedup by default but
kept for history + the read-time fallback.

***

### topics

> **topics**: [`StoredTopic`](StoredTopic.md)\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#155)

The memory's topics as the DURABLE, synced record — `entity` /
`memory_entity` are a device-local index over it. Null = pre-v42, no record
yet; `[]` = a record of "no topics".

***

### topicsExtractedAt

> **topicsExtractedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#163)

Unix ms of the last LLM topic-extraction pass over this memory's content.
Null = never extracted standalone; rows that already carry entity links
are grandfathered as extracted (see getMemoriesNeedingTopicExtractionOp).
DEPRECATED (v42) — subsumed by `topicsUpdatedAt`; see the schema note.

***

### topicsExtractedVersion

> **topicsExtractedVersion**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#174)

Extraction-logic version this memory was last stamped under. Null (pre-v38)
reads as 0, so a TOPICS\_EXTRACTION\_VERSION bump re-extracts stale rows.
DEPRECATED (v42) — subsumed by `topicsUpdatedAt`; see the schema note.

***

### topicsUpdatedAt

> **topicsUpdatedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#158)

Unix ms of the last `topics` write, or null if never written. Separate from
`updatedAt`, which topic writes deliberately pin (recall recency).

***

### topicsUserManaged

> **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#151)

When true, the user has manually set this memory's topics (entity links);
auto-extraction leaves them alone. False on legacy/auto rows.

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#187)

Tier-0 security (PR3) — "quarantined" | "trusted" | null.

***

### twinOptIn

> **twinOptIn**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#192)

Owner opted this memory into their own digital twin even when otherwise
private (twin-scoped only — never indexed for matching, never displayed).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#109)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#198)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#123)

User ID for multi-user server-side scoping, null on client

***

### visibility

> **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#189)

People Nearby cross-user visibility. Null column reads as "private".
