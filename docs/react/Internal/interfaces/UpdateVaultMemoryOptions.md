# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#29)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#30)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#36)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#34)

If provided, moves the memory to this folder.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#32)

If provided, updates the memory's scope.
