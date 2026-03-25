# getAppFileMapOp

> **getAppFileMapOp**(`ctx`: [`AppFileOperationsContext`](../interfaces/AppFileOperationsContext.md), `conversationId`: `string`): `Promise`<`Record`<`string`, `string`>>

Defined in: [src/lib/db/appFiles/operations.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/operations.ts#93)

Get all files for a conversation as a path → content map (for sending to the runner).

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

[`AppFileOperationsContext`](../interfaces/AppFileOperationsContext.md)

</td>
</tr>
<tr>
<td>

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`Record`<`string`, `string`>>
