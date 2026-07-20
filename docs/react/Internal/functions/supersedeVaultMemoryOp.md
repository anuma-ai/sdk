# supersedeVaultMemoryOp

> **supersedeVaultMemoryOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`, `supersededById`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:685](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#685)

Mark a memory as superseded by a newer one (A2 write-time supersession).
The row stays in the table (history + read-time fallback) but is excluded
from recall/dedup by default via `superseded_by`. Idempotent-ish: no-op if
the row is missing, not owned, deleted, or already superseded. Does NOT
preserve `updated_at` — superseded rows are hidden from recall, so their
recency is irrelevant.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
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
<td>

‐

</td>
</tr>
<tr>
<td>

`id`

</td>
<td>

`string`

</td>
<td>

the memory being retired (e.g. "Lives in Portland")

</td>
</tr>
<tr>
<td>

`supersededById`

</td>
<td>

`string`

</td>
<td>

the newer memory that replaced it (e.g. "Lives in SF")

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
