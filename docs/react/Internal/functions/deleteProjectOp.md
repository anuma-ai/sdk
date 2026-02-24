# deleteProjectOp

> **deleteProjectOp**(`ctx`: [`ProjectOperationsContext`](../interfaces/ProjectOperationsContext.md), `id`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/project/operations.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/operations.ts#L128)

Soft delete a project. Does not delete associated conversations.

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
