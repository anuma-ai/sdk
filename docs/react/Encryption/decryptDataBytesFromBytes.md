# decryptDataBytesFromBytes

> **decryptDataBytesFromBytes**(`encrypted`: `Uint8Array`, `address`: `string`, `version`: `EncryptionKeyVersion`): `Promise`<`Uint8Array`<`ArrayBufferLike`>>

Defined in: [src/react/useEncryption.ts:714](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#714)

Like [decryptDataBytes](../Internal/functions/decryptDataBytes.md) but takes the raw encrypted bytes
(`[IV][ciphertext+tag]`) directly instead of a hex string. Skips the
`hexToBytes` conversion — for large binary media the hex string the caller
would otherwise build is a ~1.37x copy of the whole payload (a ~1GB string
for a 500MB video), plus this avoids a second byte copy. Same key resolution
as decryptDataBytes.

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

`encrypted`

</td>
<td>

`Uint8Array`

</td>
<td>

`undefined`

</td>
<td>

Raw encrypted bytes (IV + ciphertext + auth tag), no hex

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

Encryption key version to decrypt with (defaults to "v3")

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Uint8Array`<`ArrayBufferLike`>>

Decrypted data as Uint8Array
