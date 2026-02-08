# updateConversationProjectOp

> **updateConversationProjectOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `id`: `string`, `projectId`: `string` | `null`): `Promise`<`boolean`>

Defined in: [src/lib/db/chat/operations.ts:218](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L218)

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
