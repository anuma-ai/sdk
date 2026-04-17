# decryptDataWithKey

> **decryptDataWithKey**(`encryptedHex`: `string`, `key`: `CryptoKey`): `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:652](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#652)

**`Internal`**

Decrypts data using a pre-fetched CryptoKey.
Use this for batch operations to avoid repeated key lookups.

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

`encryptedHex`

</td>
<td>

`string`

</td>
<td>

Encrypted data as hex string (IV + ciphertext + auth tag)

</td>
</tr>
<tr>
<td>

`key`

</td>
<td>

`CryptoKey`

</td>
<td>

The CryptoKey for AES-GCM decryption

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

Decrypted data as string
