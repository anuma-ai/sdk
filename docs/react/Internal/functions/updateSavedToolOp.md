# updateSavedToolOp

> **updateSavedToolOp**(`ctx`: [`SavedToolOperationsContext`](../interfaces/SavedToolOperationsContext.md), `uniqueId`: `string`, `opts`: [`UpdateSavedToolOptions`](../interfaces/UpdateSavedToolOptions.md)): `Promise`<`boolean`>

Defined in: [src/lib/db/savedTools/operations.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/operations.ts#79)

Update an existing saved tool. Returns true if the record was found and updated.

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
<tr>
<td>

`opts`

</td>
<td>

[`UpdateSavedToolOptions`](../interfaces/UpdateSavedToolOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
