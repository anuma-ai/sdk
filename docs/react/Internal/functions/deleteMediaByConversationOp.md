# deleteMediaByConversationOp

> **deleteMediaByConversationOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `conversationId`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/media/operations.ts:716](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/operations.ts#L716)

Delete all media for a conversation (when conversation is deleted).
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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`>
