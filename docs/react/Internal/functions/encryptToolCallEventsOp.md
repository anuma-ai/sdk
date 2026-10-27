# encryptToolCallEventsOp

> **encryptToolCallEventsOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)): `Promise`<`number`>

Defined in: [src/lib/db/chat/operations.ts:1359](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1359)

Encrypts tool call arguments and results still stored in plaintext and
returns how many rows changed, giving each touched conversation a new
`updatedAt` so backups re-upload it, which moves it to the top of any list
sorted by `updatedAt`.

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
</tbody>
</table>

## Returns

`Promise`<`number`>
