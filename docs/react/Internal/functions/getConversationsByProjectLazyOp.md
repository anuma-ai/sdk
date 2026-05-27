# getConversationsByProjectLazyOp

> **getConversationsByProjectLazyOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `projectId`: `string` | `null`): `Promise`<[`LazyStoredConversation`](../interfaces/LazyStoredConversation.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#279)

Lazy variant of [getConversationsByProjectOp](getConversationsByProjectOp.md).

Same encrypted-title projection as [getConversationsLazyOp](getConversationsLazyOp.md),
filtered by project assignment. Pass `null` to retrieve conversations
with no project.

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

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

</td>
</tr>
<tr>
<td>

`projectId`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`LazyStoredConversation`](../interfaces/LazyStoredConversation.md)\[]>
