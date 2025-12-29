# decryptField()

> **decryptField**(`value`, `address`, `signMessage?`, `onMigrated?`): `Promise`\<`string`\>

Defined in: [src/lib/db/memory/encryption.ts:125](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/encryption.ts#L125)

Decrypt a single string value using the SDK's decryption.
Supports both v1 (legacy) and v2 encryption formats.
Automatically migrates old encrypted values to new format.

## Parameters

### value

`string`

The encrypted value (with prefix)

### address

`string`

The user's wallet address (encryption key identifier)

### signMessage?

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

Optional function to sign message for migration (required if old encryption detected)

### onMigrated?

(`migratedValue`) => `Promise`\<`void`\>

Optional callback when a value is migrated

## Returns

`Promise`\<`string`\>

The decrypted plain text, original value if not encrypted, or placeholder on error
