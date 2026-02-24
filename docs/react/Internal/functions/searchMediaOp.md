# searchMediaOp

> **searchMediaOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `walletAddress`: `string`, `query`: `string`, `limit?`: `number`): `Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>

Defined in: [src/lib/db/media/operations.ts:632](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#632)

Search media by name.
Handles both encrypted and plaintext names:

* First tries SQL LIKE for plaintext/legacy records
* Then fetches all records and filters decrypted names in memory
* Deduplicates and returns merged results

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>
