# getConversationMemoriesOp

> **getConversationMemoriesOp**(`ctx`: [`ConversationMemoryOperationsContext`](../interfaces/ConversationMemoryOperationsContext.md), `conversationId`: `string`): `Promise`<[`StoredConversationMemory`](../interfaces/StoredConversationMemory.md)\[]>

Defined in: [src/lib/db/conversationMemory/operations.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/operations.ts#99)

List a conversation's recorded memories, oldest first.

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
</tbody>
</table>

## Returns

`Promise`<[`StoredConversationMemory`](../interfaces/StoredConversationMemory.md)\[]>
