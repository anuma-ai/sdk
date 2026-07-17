# hardDeleteDecayedOp

> **hardDeleteDecayedOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`, `opts`: `object`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:1058](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1058)

Hard-delete a memory ONLY if it is still archived and still past the delete
window (PR2 decay terminal transition). Unlike the generic
[deleteVaultMemoryOp](deleteVaultMemoryOp.md), this re-reads `archived_at` INSIDE the writer and
bails if the row was restored (`archived_at → null`) or re-archived more
recently since the sweep's candidate scan. This is the restore-vs-delete
mutual-exclusion guard: a user hitting Restore between the scan and this write
must win, so their just-rescued memory is never permanently lost.

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

`opts`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`opts.hardDeleteWindowMs`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`opts.now?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>

`true` if this call hard-deleted the row; `false` if it was stale
(deleted / not owned / no longer archived / no longer past the window).
