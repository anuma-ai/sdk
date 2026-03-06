# moveMemoriesToFolderOp

> **moveMemoriesToFolderOp**(`ctx`: [`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md), `memoryIds`: `string`\[], `folderId`: `string` | `null`): `Promise`<`boolean`>

Defined in: [src/lib/db/vaultFolders/operations.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/operations.ts#152)

Move memories to a folder (or unfile them by passing null).

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

`memoryIds`

</td>
<td>

`string`\[]

</td>
</tr>
<tr>
<td>

`folderId`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
