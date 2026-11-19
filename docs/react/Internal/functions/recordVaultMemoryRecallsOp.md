# recordVaultMemoryRecallsOp

> **recordVaultMemoryRecallsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `ids`: readonly `string`\[]): `Promise`<`void`>

Defined in: [src/lib/db/memoryVault/operations.ts:1512](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1512)

Add one to the recall count of each live, owned memory in `ids`, without moving `updated_at`.

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

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
</tr>
<tr>
<td>

`ids`

</td>
<td>

readonly `string`\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`void`>
