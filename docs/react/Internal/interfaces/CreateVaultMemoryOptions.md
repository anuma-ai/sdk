# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#21)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#22)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

JSON-stringified embedding vector to persist

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#30)

Model used to generate the embedding

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#26)

Folder ID for organization, null or omitted if unfiled

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#24)

Scope for the memory. Defaults to "private" if omitted.
