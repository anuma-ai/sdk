# readEncryptedFile

> **readEncryptedFile**(`fileId`: `string`, `encryptionKey`: `CryptoKey`): `Promise`<{ `blob`: `Blob`; `metadata`: `StoredFileMetadata`; } | `null`>

Defined in: [src/lib/storage/opfs.ts:197](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L197)

Reads and decrypts a file from OPFS.

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

The file identifier

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

CryptoKey for decryption

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<{ `blob`: `Blob`; `metadata`: `StoredFileMetadata`; } | `null`>

The decrypted blob, or null if not found
