# supersedeVaultMemoryOp

> **supersedeVaultMemoryOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`, `supersededById`: `string`, `opts?`: `object`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:1546](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1546)

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
<tr>
<td>

`opts?`

</td>
<td>

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`opts.expectedProofCount?`

</td>
<td>

`number` | `null`

</td>
<td>

Optimistic-concurrency guard: skip the supersede if the row's
`proof_count` moved since the caller observed it (a concurrent
re-observation). Keyed on `proof_count` and NOT `updated_at` on purpose —
retain()'s merge on an ACTIVE row passes `preserveUpdatedAt: true`, so a
re-observation bumps `proof_count` + `last_observed_at` while
`updated_at` stays pinned. An `expectedUpdatedAt`-style guard (see
[archiveVaultMemoryOp](archiveVaultMemoryOp.md)) therefore cannot see a merge at all, which
is exactly the race a background sweep hits: it selects a cluster, retain
reinforces one of the non-survivors, and the sweep would still retire the
freshly-confirmed row. Omit for callers that have no scan to be stale
against (retain's own supersede paths write in the same turn).

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
