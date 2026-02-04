# getConversationsByProjectOp

> **getConversationsByProjectOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `projectId`: `string` | `null`): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L178)

Get conversations filtered by project ID.
Pass null to get conversations that don't belong to any project.

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

`Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>
