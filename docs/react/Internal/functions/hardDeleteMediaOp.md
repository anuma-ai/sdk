# hardDeleteMediaOp

> **hardDeleteMediaOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `mediaId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/media/operations.ts:360](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/operations.ts#L360)

Permanently delete a media record (hard delete).
Also removes the file from OPFS.

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

`mediaId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
