# deleteVaultFolderOp

> **deleteVaultFolderOp**(`ctx`: [`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md), `id`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/vaultFolders/operations.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#112)

Soft-delete a vault folder and unfile all its memories in a single write.

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
</tbody>
</table>

## Returns

`Promise`<`boolean`>
