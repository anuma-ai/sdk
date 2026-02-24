# decryptData

> **decryptData**(`encryptedHex`: `string`, `address`: `string`, `version`: `EncryptionKeyVersion`): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#503)

Decrypts data using AES-GCM with the stored encryption key.

This function uses the encryption key previously generated via `requestEncryptionKey`
to decrypt data. The key must exist in memory before calling this function, or it
will throw an error prompting the user to sign a message.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`encryptedHex`

</td>
<td>

`string`

</td>
<td>

`undefined`

</td>
<td>

Encrypted data as hex string (IV + ciphertext + auth tag)

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

`undefined`

</td>
<td>

The wallet address associated with the encryption key

</td>
</tr>
<tr>
<td>

`version`

</td>
<td>

`EncryptionKeyVersion`

</td>
<td>

`"v3"`

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

Decrypted data as string

## Throws

Error if encryption key is not found in memory or if decryption fails

## Example

```tsx
import { decryptData, requestEncryptionKey } from "@anuma/sdk/react";

// First, ensure encryption key exists
await requestEncryptionKey(walletAddress);

// Then decrypt data
const encrypted = localStorage.getItem("mySecret");
if (encrypted) {
  const decrypted = await decryptData(encrypted, walletAddress);
  console.log("Decrypted:", decrypted);
}
```
