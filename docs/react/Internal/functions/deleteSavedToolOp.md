# deleteSavedToolOp

> **deleteSavedToolOp**(`ctx`: [`SavedToolOperationsContext`](../interfaces/SavedToolOperationsContext.md), `uniqueId`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/savedTools/operations.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/operations.ts#108)

Soft-delete a saved tool. Returns true if the record was found and deleted.

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

`Promise`<`boolean`>
