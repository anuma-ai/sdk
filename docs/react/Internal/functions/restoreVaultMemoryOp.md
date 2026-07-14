# restoreVaultMemoryOp

> **restoreVaultMemoryOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:961](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#961)

Restore an archived memory (PR2) — clear `archived_at` so it re-enters recall.
Re-checks `is_deleted` / ownership inside the writer. Idempotent on an
already-active row (clearing null → null is harmless).

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
</tbody>
</table>

## Returns

`Promise`<`boolean`>

`true` if the row was restored (or already active); `false` if it was
deleted / not owned / missing.
