# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#33)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#34)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#40)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#38)

If provided, moves the memory to this folder.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#36)

If provided, updates the memory's scope.
