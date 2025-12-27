# encryptField()

> **encryptField**(`value`, `address`): `Promise`\<`string`\>

Defined in: [src/lib/db/memory/encryption.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/encryption.ts#L84)

Encrypt a single string value using the SDK's encryption.
Returns the encrypted value with a prefix for identification.

## Parameters

### value

`string`

The plain text value to encrypt

### address

`string`

The user's wallet address (encryption key identifier)

## Returns

`Promise`\<`string`\>

The encrypted value with prefix

## Throws

If encryption fails - prevents sensitive data from being stored unencrypted
