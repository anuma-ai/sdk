# getVaultFolderMemoryCountOp

> **getVaultFolderMemoryCountOp**(`ctx`: [`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md), `folderId`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/vaultFolders/operations.ts:296](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#296)

Get the count of the context user's non-deleted memories in a folder.
Returns 0 for a folder the context user doesn't own.

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

`folderId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`>
