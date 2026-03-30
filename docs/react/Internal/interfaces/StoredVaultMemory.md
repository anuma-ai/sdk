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

Defined in: [src/lib/db/memoryVault/types.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#16)

***

### embedding

> **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#13)

JSON-stringified embedding vector, null if not yet computed

***

### embeddingModel

> **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#15)

Model used to generate the embedding, null if unknown

***

### folderId

> **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#9)

Folder ID for organization, null if unfiled

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memoryVault/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#18)

***

### scope

> **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#7)

Scope for partitioning memories (e.g., "private", "shared")

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:3](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#3)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memoryVault/types.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#17)

***

### userId

> **userId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#11)

User ID for multi-user server-side scoping, null on client
