# getProjectsOp

> **getProjectsOp**(`ctx`: [`ProjectOperationsContext`](../interfaces/ProjectOperationsContext.md)): `Promise`<[`StoredProject`](../interfaces/StoredProject.md)\[]>

Defined in: [src/lib/db/project/operations.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/project/operations.ts#L71)

Get all non-deleted projects, sorted by creation date (newest first).

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
</tbody>
</table>

## Returns

`Promise`<[`StoredProject`](../interfaces/StoredProject.md)\[]>
