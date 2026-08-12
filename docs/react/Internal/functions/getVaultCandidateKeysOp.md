# getVaultCandidateKeysOp

> **getVaultCandidateKeysOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: `object`): `Promise`<[`VaultCandidateKey`](../interfaces/VaultCandidateKey.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:787](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#787)

Column-projected candidate keys — id + rank-metadata, NO content/embedding
blobs. On OPFS-SQLite this is a projected SELECT (skips the blobs on disk);
on LokiJS (Q.unsafeSqlQuery throws) it falls back to the standard Q query +
unsafeFetchRaw (blobs are already resident there, so the read is free).

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

`options?`

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

`options.factTypes?`

</td>
<td>

`string`\[]

</td>
<td>

Typed memory (PR1) — restrict to these fact types. Omit for no filter.
MUST stay in step with `getAllVaultMemoriesOp`: this op backs the
decrypt-last search path, and the two paths are meant to return the same
candidate set for the same query. Dropping it here made typed recall
silently path-dependent (#779).

</td>
</tr>
<tr>
<td>

`options.folderId?`

</td>
<td>

`string` | `null`

</td>
<td>

‐

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

Include archived (decayed) memories. Default `false`, as elsewhere.

</td>
</tr>
<tr>
<td>

`options.scopes?`

</td>
<td>

`string`\[]

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`VaultCandidateKey`](../interfaces/VaultCandidateKey.md)\[]>
