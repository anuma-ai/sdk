# getRecentMediaOp

> **getRecentMediaOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `walletAddress`: `string`, `limit`: `number`): `Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>

Defined in: [src/lib/db/media/operations.ts:617](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/operations.ts#L617)

Get recent media for library homepage.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
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
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`limit`

</td>
<td>

`number`

</td>
<td>

`20`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>
