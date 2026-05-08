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

Defined in: [src/lib/db/memoryVault/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#26)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#13)

JSON-stringified embedding vector, null if not yet computed

***

### eventTimeEnd

> **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#23)

W6 temporal lane — Unix ms when the event ended (range only).

***

### eventTimeKind

> **eventTimeKind**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#25)

W6 temporal lane — `point | range | ongoing | null`.

***

### eventTimeStart

> **eventTimeStart**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#21)

W6 temporal lane — Unix ms when the event occurred (point/start of range).

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#9)

Folder ID for organization, null if unfiled

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

***

### proofCount

> **proofCount**: `number` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#17)

Times this fact has been re-observed (for ranking + UX badges).

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#7)

Scope for partitioning memories (e.g., "private", "shared")

***

### source

> **source**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#19)

How the memory was created: manual | auto-extracted | capsule.

***

### sourceChunkIds

> **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#15)

JSON-stringified array of source message IDs this fact was extracted from.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:3](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#3)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#27)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#11)

User ID for multi-user server-side scoping, null on client
