# decryptDataBytes()

> **decryptDataBytes**(`encryptedHex`: `string`, `address`: `string`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [src/react/useEncryption.ts:483](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L483)

Decrypts data and returns as Uint8Array (for binary data)

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encryptedHex` | `string` | Encrypted data as hex string (IV + ciphertext + auth tag) |
| `address` | `string` | - |

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Decrypted data as Uint8Array
