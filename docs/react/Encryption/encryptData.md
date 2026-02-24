# encryptData

> **encryptData**(`plaintext`: `string` | `Uint8Array`<`ArrayBufferLike`>, `address`: `string`): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:459](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#L459)

Encrypts data using AES-GCM with the stored encryption key.

This function uses the encryption key previously generated via `requestEncryptionKey`
to encrypt data. The key must exist in memory before calling this function, or it
will throw an error prompting the user to sign a message.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`plaintext`

</td>
<td>

`string` | `Uint8Array`<`ArrayBufferLike`>

</td>
<td>

The data to encrypt (string or Uint8Array)

</td>
</tr>
<tr>
<td>

`address`

</td>
<td>

`string`

</td>
<td>

The wallet address associated with the encryption key

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

Encrypted data as hex string (IV + ciphertext + auth tag)

## Throws

Error if encryption key is not found in memory

## Example

```tsx
import { encryptData, requestEncryptionKey } from "@anuma/sdk/react";

// First, ensure encryption key exists
await requestEncryptionKey(walletAddress);

// Then encrypt data
const encrypted = await encryptData("my secret data", walletAddress);
localStorage.setItem("mySecret", encrypted);
```
