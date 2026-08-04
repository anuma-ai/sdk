# getVaultMemoriesByIdsOp

> **getVaultMemoriesByIdsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `ids`: `string`\[], `options?`: `object`): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:929](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#929)

Bulk-decrypt a KNOWN set of memories by ID — the "decrypt last" half of
on-demand recall (#5017) for lanes whose size is NOT bounded to the top-N
(e.g. the keyword lane over un-embedded rows). Uses `unsafeFetchRaw` + a
single `id oneOf` query so it does NOT pin a WatermelonDB Model per row into
the never-evicted RecordCache — unlike calling [getVaultMemoryOp](getVaultMemoryOp.md) N
times, which `.find()`s each row and is only appropriate for the bounded
top-N winners (web Pile-2 tab-memory).

Reuses `baseVaultConditions`, so deleted / superseded / cross-user rows are
excluded exactly as they are from recall — a caller can pass any id list and
only its own live rows come back.

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

`ids`

</td>
<td>

`string`\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
<td>

See [getVaultEmbeddingsByIdsOp](getVaultEmbeddingsByIdsOp.md) — must match what admitted these ids.

</td>
</tr>
<tr>
<td>

`options.includeArchived?`

</td>
<td>

`boolean`

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>
