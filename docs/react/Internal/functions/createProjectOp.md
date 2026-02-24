# createProjectOp

> **createProjectOp**(`ctx`: [`ProjectOperationsContext`](../interfaces/ProjectOperationsContext.md), `opts?`: [`CreateProjectOptions`](../interfaces/CreateProjectOptions.md), `defaultName?`: `string`): `Promise`<[`StoredProject`](../interfaces/StoredProject.md)>

Defined in: [src/lib/db/project/operations.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/project/operations.ts#L35)

Create a new project.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
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
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`opts?`

</td>
<td>

[`CreateProjectOptions`](../interfaces/CreateProjectOptions.md)

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`defaultName?`

</td>
<td>

`string`

</td>
<td>

`"New Project"`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredProject`](../interfaces/StoredProject.md)>
