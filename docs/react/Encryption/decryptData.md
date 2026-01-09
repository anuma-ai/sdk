# decryptData

> **decryptData**(`encryptedHex`: `string`, `address`: `string`): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:455](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L455)

Decrypts data using AES-GCM with the stored encryption key.

This function uses the encryption key previously generated via `requestEncryptionKey`
to decrypt data. The key must exist in memory before calling this function, or it
will throw an error prompting the user to sign a message.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encryptedHex` | `string` | Encrypted data as hex string (IV + ciphertext + auth tag) |
| `address` | `string` | The wallet address associated with the encryption key |

## Returns

`Promise`<`string`>

Decrypted data as string

## Throws

Error if encryption key is not found in memory or if decryption fails

## Example

```tsx
import { decryptData, requestEncryptionKey } from "@reverbia/sdk/react";

// First, ensure encryption key exists
await requestEncryptionKey(walletAddress);

// Then decrypt data
const encrypted = localStorage.getItem("mySecret");
if (encrypted) {
  const decrypted = await decryptData(encrypted, walletAddress);
  console.log("Decrypted:", decrypted);
}
```
