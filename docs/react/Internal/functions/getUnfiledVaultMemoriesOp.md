# getUnfiledVaultMemoriesOp

> **getUnfiledVaultMemoriesOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#275)

Get all non-deleted, unfiled vault memories (folder\_id is null).

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
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>
