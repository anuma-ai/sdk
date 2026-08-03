# StoredVaultMemory

Defined in: [src/lib/db/memoryVault/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#19)

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#86)

Decay archive state (PR2) — Unix ms when archived, or null when active.

***

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#23)

Plain text memory content

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#98)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#31)

JSON-stringified embedding vector, null if not yet computed

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#34)

Model that produced `embedding`. Null on legacy rows (grandfathered as
compatible with the current model).

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#47)

W6 temporal lane — Unix ms when the event ended (range only).

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#49)

W6 temporal lane — `point | range | ongoing | null`.

***

### eventTimeStart

> **eventTimeStart**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#45)

W6 temporal lane — Unix ms when the event occurred (point/start of range).

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#84)

Typed memory (PR1) — the extractor's FactType for this fact, or null on
legacy/manual/untyped rows. Plaintext string (not narrowed to FactType
here since the DB can hold any stored value).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#27)

Folder ID for organization, null if unfiled

***

### geohash

> **geohash**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#97)

Reserved coarse-geohash slot for landmark/Trail memories.

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#100)

***

### lastObservedAt

> **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#80)

C3 re-observation watermark: Unix ms of the last retain() merge into this
fact. Distinct from `updatedAt` (which merges preserve). Null = never
re-observed since the column was added; synthesis falls back to
`updatedAt` in that case.

***

### media

> **media**: [`PhotoMediaRef`](PhotoMediaRef.md)\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#43)

The photo(s) a SERVER-EXTRACTED memory was read out of. Null on every
memory that did not come from a photo. See [PhotoMediaRef](PhotoMediaRef.md).

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#38)

Times this fact has been re-observed (for ranking + UX badges).

***

### publishedAt

> **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#95)

Unix ms when visibility last became non-private; null while private.

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#25)

Scope for partitioning memories (e.g., "private", "shared")

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#40)

How the memory was created: manual | auto-extracted | capsule | photo.

***

### sourceChunkIds

> **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#36)

JSON-stringified array of source message IDs this fact was extracted from.

***

### supersededAt

> **supersededAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#71)

Unix ms when this memory was superseded. Null when live.

***

### supersededBy

> **supersededBy**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#69)

Write-time supersession (A2): id of the newer memory that replaced this
one (incompatible-value update, e.g. "Lives in Portland" → "Lives in SF").
Null = live. Superseded rows are excluded from recall/dedup by default but
kept for history + the read-time fallback.

***

### topics

> **topics**: [`StoredTopic`](StoredTopic.md)\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#56)

The memory's topics as the DURABLE, synced record — `entity` /
`memory_entity` are a device-local index over it. Null = pre-v42, no record
yet; `[]` = a record of "no topics".

***

### topicsExtractedAt

> **topicsExtractedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#64)

Unix ms of the last LLM topic-extraction pass over this memory's content.
Null = never extracted standalone; rows that already carry entity links
are grandfathered as extracted (see getMemoriesNeedingTopicExtractionOp).
DEPRECATED (v42) — subsumed by `topicsUpdatedAt`; see the schema note.

***

### topicsExtractedVersion

> **topicsExtractedVersion**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#75)

Extraction-logic version this memory was last stamped under. Null (pre-v38)
reads as 0, so a TOPICS\_EXTRACTION\_VERSION bump re-extracts stale rows.
DEPRECATED (v42) — subsumed by `topicsUpdatedAt`; see the schema note.

***

### topicsUpdatedAt

> **topicsUpdatedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#59)

Unix ms of the last `topics` write, or null if never written. Separate from
`updatedAt`, which topic writes deliberately pin (recall recency).

***

### topicsUserManaged

> **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#52)

When true, the user has manually set this memory's topics (entity links);
auto-extraction leaves them alone. False on legacy/auto rows.

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#88)

Tier-0 security (PR3) — "quarantined" | "trusted" | null.

***

### twinOptIn

> **twinOptIn**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#93)

Owner opted this memory into their own digital twin even when otherwise
private (twin-scoped only — never indexed for matching, never displayed).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#21)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#99)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#29)

User ID for multi-user server-side scoping, null on client

***

### visibility

> **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#90)

People Nearby cross-user visibility. Null column reads as "private".
