# ensureDefaultFoldersOp

> **ensureDefaultFoldersOp**(`ctx`: [`VaultFolderOperationsContext`](../interfaces/VaultFolderOperationsContext.md)): `Promise`<`Map`<`string`, `string`>>

Defined in: [src/lib/db/vaultFolders/defaults.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/vaultFolders/defaults.ts#20)

Ensure all default system folders exist. Idempotent — skips folders that already exist.
Uses a per-database promise lock so concurrent callers share a single in-flight operation.
Returns a map of ALL folder names (system + user-created) to their IDs.

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

`Promise`<`Map`<`string`, `string`>>
