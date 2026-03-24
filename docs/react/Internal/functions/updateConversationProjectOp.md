# updateConversationProjectOp

> **updateConversationProjectOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `id`: `string`, `projectId`: `string` | `null`): `Promise`<`boolean`>

Defined in: [src/lib/db/chat/operations.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#280)

Update a conversation's project assignment.
Pass null to remove the conversation from any project.

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

`id`

</td>
<td>

`string`

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

`Promise`<`boolean`>
