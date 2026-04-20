# getAppFileOp

> **getAppFileOp**(`ctx`: [`AppFileOperationsContext`](../interfaces/AppFileOperationsContext.md), `conversationId`: `string`, `path`: `string`): `Promise`<[`StoredAppFile`](../interfaces/StoredAppFile.md) | `null`>

Defined in: [src/lib/db/appFiles/operations.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/appFiles/operations.ts#65)

Read a single file by conversationId and path. Returns null if not found.

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
<tr>
<td>

`path`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredAppFile`](../interfaces/StoredAppFile.md) | `null`>
