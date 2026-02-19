# getDisplayInteractionsByConversationOp

> **getDisplayInteractionsByConversationOp**(`ctx`: [`DisplayInteractionOperationsContext`](../interfaces/DisplayInteractionOperationsContext.md), `conversationId`: `string`): `Promise`<[`StoredDisplayInteraction`](../interfaces/StoredDisplayInteraction.md)\[]>

Defined in: [src/lib/db/displayInteraction/operations.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/operations.ts#L52)

Fetch all display interactions for a conversation, ordered by creation time.

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

[`DisplayInteractionOperationsContext`](../interfaces/DisplayInteractionOperationsContext.md)

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

`Promise`<[`StoredDisplayInteraction`](../interfaces/StoredDisplayInteraction.md)\[]>
