# getSavedToolByIdOp

> **getSavedToolByIdOp**(`ctx`: [`SavedToolOperationsContext`](../interfaces/SavedToolOperationsContext.md), `uniqueId`: `string`): `Promise`<[`StoredSavedTool`](../interfaces/StoredSavedTool.md) | `null`>

Defined in: [src/lib/db/savedTools/operations.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/operations.ts#65)

Fetch a single saved tool by its WatermelonDB ID. Returns null if not found or deleted.

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

[`SavedToolOperationsContext`](../interfaces/SavedToolOperationsContext.md)

</td>
</tr>
<tr>
<td>

`uniqueId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredSavedTool`](../interfaces/StoredSavedTool.md) | `null`>
