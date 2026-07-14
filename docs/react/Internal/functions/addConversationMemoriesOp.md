# addConversationMemoriesOp

> **addConversationMemoriesOp**(`ctx`: [`ConversationMemoryOperationsContext`](../interfaces/ConversationMemoryOperationsContext.md), `conversationId`: `string`, `items`: [`ConversationMemoryInput`](../interfaces/ConversationMemoryInput.md)\[]): `Promise`<`void`>

Defined in: [src/lib/db/conversationMemory/operations.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/operations.ts#36)

Record the memories a turn drew on for a conversation. Dedupes on
(conversation\_id, memory\_id) against existing rows, keeps insertion order, and
prunes the oldest rows beyond MAX\_PER\_CONVERSATION. No-ops on an empty
conversation id or empty item list.

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

[`ConversationMemoryOperationsContext`](../interfaces/ConversationMemoryOperationsContext.md)

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

`items`

</td>
<td>

[`ConversationMemoryInput`](../interfaces/ConversationMemoryInput.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`void`>
