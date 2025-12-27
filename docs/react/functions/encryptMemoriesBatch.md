# encryptMemoriesBatch()

> **encryptMemoriesBatch**\<`T`\>(`memories`, `address`): `Promise`\<`T`[]\>

Defined in: src/lib/db/memory/encryption.ts:308

Batch encrypt multiple memory objects.
Uses parallel processing for performance.

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

## Returns

`Promise`\<`T`[]\>

Array of memory objects with encrypted fields
