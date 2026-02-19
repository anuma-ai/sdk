# writeEncryptedFile

> **writeEncryptedFile**(`fileId`: `string`, `blob`: `Blob`, `encryptionKey`: `CryptoKey`, `metadata?`: `object`): `Promise`<`void`>

Defined in: [src/lib/storage/opfs.ts:198](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L198)

Writes an encrypted file to OPFS.

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

`fileId`

</td>
<td>

`string`

</td>
<td>

Unique identifier for the file

</td>
</tr>
<tr>
<td>

`blob`

</td>
<td>

`Blob`

</td>
<td>

The file content

</td>
</tr>
<tr>
<td>

`encryptionKey`

</td>
<td>

`CryptoKey`

</td>
<td>

CryptoKey for encryption

</td>
</tr>
<tr>
<td>

`metadata?`

</td>
<td>

`object`

</td>
<td>

Optional metadata (name, type, sourceUrl)

</td>
</tr>
<tr>
<td>

`metadata.name?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`metadata.sourceUrl?`

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

`Promise`<`void`>
