# getAllVaultFoldersOp

> **getAllVaultFoldersOp**(`ctx`: [`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md)): `Promise`<[`StoredVaultFolder`](../interfaces/StoredVaultFolder.md)\[]>

Defined in: [src/lib/db/vaultFolders/operations.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#50)

Get all non-deleted vault folders, sorted by creation date (newest first).

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
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultFolder`](../interfaces/StoredVaultFolder.md)\[]>
