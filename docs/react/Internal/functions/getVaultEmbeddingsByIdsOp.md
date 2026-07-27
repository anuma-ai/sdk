# getVaultEmbeddingsByIdsOp

> **getVaultEmbeddingsByIdsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `ids`: `string`\[], `options?`: `object`): `Promise`<`object`\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:793](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#793)

Column-projected embedding lookup for a KNOWN set of ids — id + embedding +
embedding\_model, NO content. Used to backfill cache-miss vectors during
ranking without paying the content-decrypt cost. Mirrors
[getVaultCandidateKeysOp](getVaultCandidateKeysOp.md)'s dual-path shape: a projected SELECT on
OPFS-SQLite, falling back to the standard Q query + unsafeFetchRaw on
LokiJS (Q.unsafeSqlQuery throws there).

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

Must match whatever admitted these ids. The caller has already filtered the
candidate set; re-applying a DEFAULT-ON exclusion here silently deletes rows
it deliberately admitted — which is how archived rows passed the key scan
and then vanished at hydration (#779).

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

`Promise`<`object`\[]>
