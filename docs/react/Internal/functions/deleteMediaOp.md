# deleteMediaOp

> **deleteMediaOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `mediaId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/media/operations.ts:334](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/operations.ts#L334)

Soft delete a media record.
Clears source\_url, removes file from OPFS, but keeps all metadata.

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
