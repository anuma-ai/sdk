# encryptMemoryFields()

> **encryptMemoryFields**\<`T`\>(`memory`, `address`): `Promise`\<`T`\>

Defined in: [src/lib/db/memory/encryption.ts:211](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/encryption.ts#L211)

Encrypt sensitive fields in a memory object.
Only encrypts the fields defined in ENCRYPTED_FIELDS.
Embeddings and other indexed fields are left unencrypted.

## Type Parameters

### T

`T` *extends* [`MemoryData`](../interfaces/MemoryData.md)

## Parameters

### memory

`T`

The memory object with plain text fields

### address

`string`

The user's wallet address

## Returns

`Promise`\<`T`\>

A new memory object with sensitive fields encrypted
