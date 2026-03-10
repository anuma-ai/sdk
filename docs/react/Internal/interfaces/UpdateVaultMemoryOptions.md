# UpdateVaultMemoryOptions

Defined in: [src/lib/db/memoryVault/types.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#27)

## Properties

### content

> **content**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#28)

***

### embedding?

> `optional` **embedding**: `string` | `null`

Defined in: [src/lib/db/memoryVault/types.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#32)

JSON-stringified embedding vector to persist, or null to clear stale embedding

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/db/memoryVault/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#30)

If provided, updates the memory's scope.
