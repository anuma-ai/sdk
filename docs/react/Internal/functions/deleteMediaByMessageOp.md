# deleteMediaByMessageOp

> **deleteMediaByMessageOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `messageId`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/media/operations.ts:740](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/operations.ts#L740)

Delete all media for a message (when message is deleted).
Clears source\_url, removes files from OPFS, but keeps all metadata.

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

`messageId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`>
