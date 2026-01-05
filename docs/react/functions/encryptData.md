# encryptData()

> **encryptData**(`plaintext`, `address`): `Promise`\<`string`\>

Defined in: [src/react/useEncryption.ts:359](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L359)

Encrypts data using AES-GCM with the stored encryption key

## Parameters

### plaintext

The data to encrypt (string or Uint8Array)

`string` | `Uint8Array`\<`ArrayBufferLike`\>

### address

`string`

## Returns

`Promise`\<`string`\>

Encrypted data as hex string (IV + ciphertext + auth tag)
