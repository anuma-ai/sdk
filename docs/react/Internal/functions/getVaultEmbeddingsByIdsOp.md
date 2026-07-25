# getVaultEmbeddingsByIdsOp

> **getVaultEmbeddingsByIdsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `ids`: `string`\[]): `Promise`<`object`\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:766](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#766)

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

`ids`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`object`\[]>
