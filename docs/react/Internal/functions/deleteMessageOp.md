# deleteMessageOp

> **deleteMessageOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `uniqueId`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/db/chat/operations.ts:921](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#921)

Delete a single message by its unique ID.
Clears file\_ids before deletion and returns the unique ID.
Note: Callers should use deleteMediaByMessageOp to cascade delete media.

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

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

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

`Promise`<`string` | `null`>
