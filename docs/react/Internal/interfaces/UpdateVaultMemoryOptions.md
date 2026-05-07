# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#41)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#42)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#48)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#46)

If provided, moves the memory to this folder.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#52)

Set absolute proof count. Used during merge to increment.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#44)

If provided, updates the memory's scope.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#54)

Set source ("manual" | "auto-extracted" | "capsule").

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#50)

Replace source-chunk-ids list (used during merge to accumulate provenance).
