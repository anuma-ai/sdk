# updateVaultFolderOp

> **updateVaultFolderOp**(`ctx`: [`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md), `id`: `string`, `opts`: [`UpdateVaultFolderOptions`](../interfaces/UpdateVaultFolderOptions.md)): `Promise`<[`StoredVaultFolder`](../interfaces/StoredVaultFolder.md) | `null`>

Defined in: [src/lib/db/vaultFolders/operations.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#64)

Update a vault folder's name and/or scope.
When scope changes, cascades to all contained memories atomically.

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

[`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md)

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

`opts`

</td>
<td>

[`UpdateVaultFolderOptions`](../interfaces/UpdateVaultFolderOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultFolder`](../interfaces/StoredVaultFolder.md) | `null`>
