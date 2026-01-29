# resolveFilePlaceholders

> **resolveFilePlaceholders**(`content`: `string`, `encryptionKey`: `CryptoKey`, `blobManager`: [`BlobUrlManager`](../classes/BlobUrlManager.md)): `Promise`<`string`>

Defined in: [src/lib/storage/opfs.ts:335](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/storage/opfs.ts#L335)

Resolves file placeholders in content to blob URLs.

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

`content`

</td>
<td>

`string`

</td>
<td>

The message content with placeholders

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
<tr>
<td>

`blobManager`

</td>
<td>

[`BlobUrlManager`](../classes/BlobUrlManager.md)

</td>
<td>

BlobUrlManager to track URLs

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

Content with placeholders replaced by blob URLs
