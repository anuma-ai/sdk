# archiveVaultMemoryOp

> **archiveVaultMemoryOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`, `opts?`: `object`): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:885](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#885)

Archive a memory (decay soft state, PR2) — set `archived_at`. An archived row
drops out of every recall lane via the `baseVaultConditions` choke point but
stays recoverable via [restoreVaultMemoryOp](restoreVaultMemoryOp.md) until the hard-delete
window elapses.

Concurrency: re-checks `is_deleted` / ownership / `archived_at` INSIDE the
serialized writer (mirrors [updateVaultMemoryOp](updateVaultMemoryOp.md)). Additionally, when
`opts.expectedUpdatedAt` is given, the archive is skipped if the row's current
`updated_at` no longer matches — i.e. a `retain()` merge (which bumps
`updated_at`) landed between the sweep's candidate scan and this write, so the
fact was just re-observed and must NOT be archived on stale data. Idempotent:
a row another sweep already archived returns `false` (no double-write).

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

‐

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

`opts.expectedUpdatedAt?`

</td>
<td>

`number`

</td>
<td>

Optimistic-concurrency guard: skip if the row's `updated_at` changed
since the sweep observed it (a concurrent re-observation).

</td>
</tr>
<tr>
<td>

`opts.now?`

</td>
<td>

`number`

</td>
<td>

Timestamp to stamp into `archived_at`. Default `Date.now()`.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>

`true` if this call archived the row; `false` if it was stale
(deleted / not owned / already archived / refreshed under us).
