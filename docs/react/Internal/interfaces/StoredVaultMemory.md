# StoredVaultMemory

Defined in: [src/lib/db/memoryVault/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#18)

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#73)

Decay archive state (PR2) — Unix ms when archived, or null when active.

***

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#22)

Plain text memory content

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#85)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#30)

JSON-stringified embedding vector, null if not yet computed

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#33)

Model that produced `embedding`. Null on legacy rows (grandfathered as
compatible with the current model).

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#43)

W6 temporal lane — Unix ms when the event ended (range only).

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#45)

W6 temporal lane — `point | range | ongoing | null`.

***

### eventTimeStart

> **eventTimeStart**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#41)

W6 temporal lane — Unix ms when the event occurred (point/start of range).

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#71)

Typed memory (PR1) — the extractor's FactType for this fact, or null on
legacy/manual/untyped rows. Plaintext string (not narrowed to FactType
here since the DB can hold any stored value).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#26)

Folder ID for organization, null if unfiled

***

### geohash

> **geohash**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#84)

Reserved coarse-geohash slot for landmark/Trail memories.

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#87)

***

### lastObservedAt

> **lastObservedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#67)

C3 re-observation watermark: Unix ms of the last retain() merge into this
fact. Distinct from `updatedAt` (which merges preserve). Null = never
re-observed since the column was added; synthesis falls back to
`updatedAt` in that case.

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#37)

Times this fact has been re-observed (for ranking + UX badges).

***

### publishedAt

> **publishedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#82)

Unix ms when visibility last became non-private; null while private.

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#24)

Scope for partitioning memories (e.g., "private", "shared")

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#39)

How the memory was created: manual | auto-extracted | capsule.

***

### sourceChunkIds

> **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#35)

JSON-stringified array of source message IDs this fact was extracted from.

***

### supersededAt

> **supersededAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#59)

Unix ms when this memory was superseded. Null when live.

***

### supersededBy

> **supersededBy**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#57)

Write-time supersession (A2): id of the newer memory that replaced this
one (incompatible-value update, e.g. "Lives in Portland" → "Lives in SF").
Null = live. Superseded rows are excluded from recall/dedup by default but
kept for history + the read-time fallback.

***

### topicsExtractedAt

> **topicsExtractedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#52)

Unix ms of the last LLM topic-extraction pass over this memory's content.
Null = never extracted standalone; rows that already carry entity links
are grandfathered as extracted (see getMemoriesNeedingTopicExtractionOp).

***

### topicsExtractedVersion

> **topicsExtractedVersion**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#62)

Extraction-logic version this memory was last stamped under. Null (pre-v38)
reads as 0, so a TOPICS\_EXTRACTION\_VERSION bump re-extracts stale rows.

***

### topicsUserManaged

> **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#48)

When true, the user has manually set this memory's topics (entity links);
auto-extraction leaves them alone. False on legacy/auto rows.

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#75)

Tier-0 security (PR3) — "quarantined" | "trusted" | null.

***

### twinOptIn

> **twinOptIn**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#80)

Owner opted this memory into their own digital twin even when otherwise
private (twin-scoped only — never indexed for matching, never displayed).

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#20)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#86)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

User ID for multi-user server-side scoping, null on client

***

### visibility

> **visibility**: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)

Defined in: [src/lib/db/memoryVault/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#77)

People Nearby cross-user visibility. Null column reads as "private".
