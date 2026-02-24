# getProjectConversationsOp

> **getProjectConversationsOp**(`ctx`: [`ProjectOperationsContext`](../interfaces/ProjectOperationsContext.md), `projectId`: `string`): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>

Defined in: [src/lib/db/project/operations.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/operations.ts#147)

Get all conversations belonging to a specific project.

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

[`ProjectOperationsContext`](../interfaces/ProjectOperationsContext.md)

</td>
</tr>
<tr>
<td>

`projectId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)\[]>
