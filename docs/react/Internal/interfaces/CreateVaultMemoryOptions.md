# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#19)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#20)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#26)

JSON-stringified embedding vector to persist

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#24)

Folder ID for organization, null or omitted if unfiled

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#22)

Scope for the memory. Defaults to "private" if omitted.
