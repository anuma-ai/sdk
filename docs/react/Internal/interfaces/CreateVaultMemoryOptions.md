# CreateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#25)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#26)

***

### embedding?

> `optional` **embedding**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#32)

JSON-stringified embedding vector to persist

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#30)

Folder ID for organization, null or omitted if unfiled

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/db/memoryVault/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#36)

Initial proof count. Defaults to 1 if omitted.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

Scope for the memory. Defaults to "private" if omitted.

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#38)

How the memory was created. Defaults to "manual" if omitted.

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/db/memoryVault/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#34)

Source message IDs that produced this fact (auto-extraction provenance).
