# getMediaByConversationOp

> **getMediaByConversationOp**(`ctx`: [`MediaOperationsContext`](../interfaces/MediaOperationsContext.md), `walletAddress`: `string`, `conversationId`: `string`, `limit?`: `number`): `Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)\[]>

Defined in: [src/lib/db/media/operations.ts:496](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/media/operations.ts#496)

Get media by conversation.

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

`conversationId`

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
