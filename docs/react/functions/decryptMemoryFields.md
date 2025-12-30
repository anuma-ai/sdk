# decryptMemoryFields()

> **decryptMemoryFields**\<`T`\>(`memory`, `address`, `signMessage?`, `updateMemory?`): `Promise`\<`T`\>

Defined in: [src/lib/db/memory/encryption.ts:262](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/encryption.ts#L262)

Decrypt sensitive fields in a memory object.
Only decrypts the fields defined in ENCRYPTED_FIELDS.
Automatically migrates old encrypted values to new format.
Also encrypts unencrypted fields when found (for users migrating to encryption).

## Type Parameters

### T

`T` *extends* [`MemoryData`](../interfaces/MemoryData.md)

## Parameters

### memory

`T`

The memory object with encrypted fields

### address

`string`

The user's wallet address

### signMessage?

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Optional function to sign message for migration (required if old encryption detected)

### updateMemory?

(`id`, `data`) => `Promise`\<`void`\>

Optional function to update memory in storage after migration/encryption

## Returns

`Promise`\<`T`\>

A new memory object with sensitive fields decrypted
