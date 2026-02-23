# decryptDataBytes

> **decryptDataBytes**(`encryptedHex`: `string`, `address`: `string`): `Promise`<`Uint8Array`<`ArrayBufferLike`>>

Defined in: [src/react/useEncryption.ts:463](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useEncryption.ts#L463)

Decrypts data and returns as Uint8Array (for binary data)

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

`address`

</td>
<td>

`string`

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
