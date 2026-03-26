# getAllSavedToolsOp

> **getAllSavedToolsOp**(`ctx`: [`SavedToolOperationsContext`](../interfaces/SavedToolOperationsContext.md)): `Promise`<[`StoredSavedTool`](../interfaces/StoredSavedTool.md)\[]>

Defined in: [src/lib/db/savedTools/operations.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/operations.ts#54)

Fetch all non-deleted saved tools, sorted by creation date (newest first).

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
</tbody>
</table>

## Returns

`Promise`<[`StoredSavedTool`](../interfaces/StoredSavedTool.md)\[]>
