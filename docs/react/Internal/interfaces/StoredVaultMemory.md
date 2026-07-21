# StoredVaultMemory

Defined in: [src/lib/db/memoryVault/types.ts:1](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#1)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:5](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#5)

Plain text memory content

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#39)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#13)

JSON-stringified embedding vector, null if not yet computed

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#16)

Model that produced `embedding`. Null on legacy rows (grandfathered as
compatible with the current model).

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#26)

W6 temporal lane — Unix ms when the event ended (range only).

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

W6 temporal lane — `point | range | ongoing | null`.

***

### eventTimeStart

> **eventTimeStart**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#24)

W6 temporal lane — Unix ms when the event occurred (point/start of range).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#9)

Folder ID for organization, null if unfiled

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#41)

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#20)

Times this fact has been re-observed (for ranking + UX badges).

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#7)

Scope for partitioning memories (e.g., "private", "shared")

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#22)

How the memory was created: manual | auto-extracted | capsule.

***

### sourceChunkIds

> **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#18)

JSON-stringified array of source message IDs this fact was extracted from.

***

### topicsExtractedAt

> **topicsExtractedAt**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#35)

Unix ms of the last LLM topic-extraction pass over this memory's content.
Null = never extracted standalone; rows that already carry entity links
are grandfathered as extracted (see getMemoriesNeedingTopicExtractionOp).

***

### topicsExtractedVersion

> **topicsExtractedVersion**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#38)

Extraction-logic version this memory was last stamped under. Null (pre-v37)
reads as 0, so a TOPICS\_EXTRACTION\_VERSION bump re-extracts stale rows.

***

### topicsUserManaged

> **topicsUserManaged**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#31)

When true, the user has manually set this memory's topics (entity links);
auto-extraction leaves them alone. False on legacy/auto rows.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:3](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#3)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#40)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#11)

User ID for multi-user server-side scoping, null on client
