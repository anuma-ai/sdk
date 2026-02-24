# decryptDataBytes

> **decryptDataBytes**(`encryptedHex`: `string`, `address`: `string`, `version`: `EncryptionKeyVersion`): `Promise`<`Uint8Array`<`ArrayBufferLike`>>

Defined in: [src/react/useEncryption.ts:517](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#517)

Decrypts data and returns as Uint8Array (for binary data)

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

‐

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

`Promise`<`Uint8Array`<`ArrayBufferLike`>>

Decrypted data as Uint8Array
