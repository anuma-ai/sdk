# encryptDataBytes

> **encryptDataBytes**(`plaintext`: `Uint8Array`, `address`: `string`): `Promise`<`Uint8Array`<`ArrayBufferLike`>>

Defined in: [src/react/useEncryption.ts:610](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#610)

Like [encryptData](encryptData.md) but takes raw bytes and returns the raw encrypted
`[IV][ciphertext+tag]` Uint8Array instead of a hex string. Avoids the hex
round-trip (`encryptData` returns hex, which callers immediately convert back
to bytes) — for large binary media that hex string is a ~1.37x copy of the
whole payload. Use for binary uploads (e.g. enc:v3 media frames).

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

`Uint8Array`

</td>
<td>

The raw bytes to encrypt

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

`Promise`<`Uint8Array`<`ArrayBufferLike`>>

Encrypted data as raw bytes (IV + ciphertext + auth tag)
