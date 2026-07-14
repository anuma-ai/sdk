# clearConversationMemoriesOp

> **clearConversationMemoriesOp**(`ctx`: [`ConversationMemoryOperationsContext`](../interfaces/ConversationMemoryOperationsContext.md), `conversationId`: `string`): `Promise`<`void`>

Defined in: [src/lib/db/conversationMemory/operations.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/conversationMemory/operations.ts#106)

Delete all recorded memories for a conversation (e.g. incognito purge).

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

`Promise`<`void`>
