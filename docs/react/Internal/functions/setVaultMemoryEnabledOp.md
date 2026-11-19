# setVaultMemoryEnabledOp

> **setVaultMemoryEnabledOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`, `enabled`: `boolean`): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md) | `null`>

Defined in: [src/lib/db/memoryVault/operations.ts:1482](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1482)

Switch a memory on or off for answers; the write moves `updated_at` so other devices pick it up.

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`enabled`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md) | `null`>
