# decryptData()

> **decryptData**(`encryptedHex`, `address`): `Promise`\<`string`\>

Defined in: [src/react/useEncryption.ts:406](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L406)

Decrypts data using AES-GCM with the stored encryption key

## Parameters

### encryptedHex

`string`

Encrypted data as hex string (IV + ciphertext + auth tag)

### address

`string`

## Returns

`Promise`\<`string`\>

Decrypted data as string
