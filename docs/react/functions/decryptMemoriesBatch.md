# decryptMemoriesBatch()

> **decryptMemoriesBatch**\<`T`\>(`memories`, `address`, `signMessage?`, `updateMemory?`): `Promise`\<`T`[]\>

Defined in: [src/lib/db/memory/encryption.ts:331](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/encryption.ts#L331)

Batch decrypt multiple memory objects.
Uses parallel processing for performance.
Automatically migrates old encrypted values to new format.

## Type Parameters

### T

`T` *extends* [`MemoryData`](../interfaces/MemoryData.md)

## Parameters

### memories

`T`[]

Array of memory objects

### address

`string`

The user's wallet address

### signMessage?

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Optional function to sign message for migration (required if old encryption detected)

### updateMemory?

(`id`, `data`) => `Promise`\<`void`\>

Optional function to update memory in storage after migration

## Returns

`Promise`\<`T`[]\>

Array of memory objects with decrypted fields
