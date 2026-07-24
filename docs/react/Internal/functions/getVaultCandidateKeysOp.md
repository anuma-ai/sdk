# getVaultCandidateKeysOp

> **getVaultCandidateKeysOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `options?`: `object`): `Promise`<[`VaultCandidateKey`](../interfaces/VaultCandidateKey.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:704](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#704)

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

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.folderId?`

</td>
<td>

`string` | `null`

</td>
</tr>
<tr>
<td>

`options.scopes?`

</td>
<td>

`string`\[]

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`VaultCandidateKey`](../interfaces/VaultCandidateKey.md)\[]>
