# getVaultFolderMemoryCountOp

> **getVaultFolderMemoryCountOp**(`ctx`: [`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md), `folderId`: `string`): `Promise`<`number`>

Defined in: [src/lib/db/vaultFolders/operations.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#334)

Get the count of the context user's non-deleted memories in a folder.

The user filter is on the memory rows, not the folder, so this counts only
the caller's own memories no matter whose folder id is passed — a foreign
folder id yields 0 without needing a separate ownership read. Deliberately a
pure indexed COUNT with no pre-`find`: a folder list calls this once per row,
so an extra round trip here is an N+1 (same posture as
../memoryVault/operations.countActiveVaultMemoriesOp).

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
