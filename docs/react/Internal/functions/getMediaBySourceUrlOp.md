# getMediaBySourceUrlOp

> **getMediaBySourceUrlOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `sourceUrl`: `string`, `walletAddress`: `string`): `Promise`<[`StoredMedia`](../interfaces/StoredMedia.md) | `null`>

Defined in: [src/lib/db/media/operations.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#224)

Get a media record by its source URL.
Note: When encryption is enabled, sourceUrl is encrypted and this query
will only match if the stored value is plaintext (legacy data).
For encrypted data, use getMediaByIdOp instead.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ctx`

</td>
<td>

[`MediaOperationsContext`](../interfaces/MediaOperationsContext.md)

</td>
</tr>
<tr>
<td>

`sourceUrl`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMedia`](../interfaces/StoredMedia.md) | `null`>
