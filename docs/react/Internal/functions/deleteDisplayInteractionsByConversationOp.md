# deleteDisplayInteractionsByConversationOp

> **deleteDisplayInteractionsByConversationOp**(`ctx`: [`DisplayInteractionOperationsContext`](../interfaces/DisplayInteractionOperationsContext.md), `conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/db/displayInteraction/operations.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/operations.ts#L70)

Delete all display interactions for a conversation.
Used when a conversation is deleted or its display data should be cleared.

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

`Promise`<`void`>
