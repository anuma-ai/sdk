# encryptData

> **encryptData**(`plaintext`: `string` | `Uint8Array`<`ArrayBufferLike`>, `address`: `string`): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:384](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L384)

Encrypts data using AES-GCM with the stored encryption key.

This function uses the encryption key previously generated via `requestEncryptionKey`
to encrypt data. The key must exist in memory before calling this function, or it
will throw an error prompting the user to sign a message.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `plaintext` | `string` | `Uint8Array`<`ArrayBufferLike`> | The data to encrypt (string or Uint8Array) |
| `address` | `string` | The wallet address associated with the encryption key |

## Returns

`Promise`<`string`>

Encrypted data as hex string (IV + ciphertext + auth tag)

## Throws

Error if encryption key is not found in memory

## Example

```tsx
import { encryptData, requestEncryptionKey } from "@reverbia/sdk/react";

// First, ensure encryption key exists
await requestEncryptionKey(walletAddress);

// Then encrypt data
const encrypted = await encryptData("my secret data", walletAddress);
localStorage.setItem("mySecret", encrypted);
```
