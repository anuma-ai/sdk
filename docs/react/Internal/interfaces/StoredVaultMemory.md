# StoredVaultMemory

Defined in: [src/lib/db/memoryVault/types.ts:3](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#3)

## Properties

### archivedAt

> **archivedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#53)

Decay archive state (PR2) — Unix ms when archived, or null when active.

***

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#7)

Plain text memory content

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#56)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#15)

JSON-stringified embedding vector, null if not yet computed

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#18)

Model that produced `embedding`. Null on legacy rows (grandfathered as
compatible with the current model).

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

W6 temporal lane — Unix ms when the event ended (range only).

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#30)

W6 temporal lane — `point | range | ongoing | null`.

***

### eventTimeStart

> **eventTimeStart**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#26)

W6 temporal lane — Unix ms when the event occurred (point/start of range).

***

### factType

> **factType**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#51)

Typed memory (PR1) — the extractor's FactType for this fact, or null on
legacy/manual/untyped rows. Plaintext string (not narrowed to FactType
here since the DB can hold any stored value).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#11)

Folder ID for organization, null if unfiled

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#58)

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#22)

Times this fact has been re-observed (for ranking + UX badges).

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#9)

Scope for partitioning memories (e.g., "private", "shared")

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#24)

How the memory was created: manual | auto-extracted | capsule.

***

### sourceChunkIds

> **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#20)

JSON-stringified array of source message IDs this fact was extracted from.

***

### supersededAt

> **supersededAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#44)

Unix ms when this memory was superseded. Null when live.

***

### supersededBy

> **supersededBy**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#42)

Write-time supersession (A2): id of the newer memory that replaced this
one (incompatible-value update, e.g. "Lives in Portland" → "Lives in SF").
Null = live. Superseded rows are excluded from recall/dedup by default but
kept for history + the read-time fallback.

***

### topicsExtractedAt

> **topicsExtractedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#37)

Unix ms of the last LLM topic-extraction pass over this memory's content.
Null = never extracted standalone; rows that already carry entity links
are grandfathered as extracted (see getMemoriesNeedingTopicExtractionOp).

***

### topicsExtractedVersion

> **topicsExtractedVersion**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#47)

Extraction-logic version this memory was last stamped under. Null (pre-v38)
reads as 0, so a TOPICS\_EXTRACTION\_VERSION bump re-extracts stale rows.

***

### topicsUserManaged

> **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#33)

When true, the user has manually set this memory's topics (entity links);
auto-extraction leaves them alone. False on legacy/auto rows.

***

### trustTier

> **trustTier**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#55)

Tier-0 security (PR3) — "quarantined" | "trusted" | null.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:5](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#5)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#57)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#13)

User ID for multi-user server-side scoping, null on client
