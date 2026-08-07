# getVaultMemoriesByFacetKeyOp

> **getVaultMemoriesByFacetKeyOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `facetKey`: `string`, `options?`: `object`): `Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:1066](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1066)

Fetch every LIVE vault memory carrying an exact `facet_key`.

NOT used by retain() — dedup goes through semantic search + the decide model,
and this op is deliberately not part of that path (an exact-equality key lookup
can never match the NULL facet\_key that every pre-v43 row carries, so it cannot
be a dedup mechanism on an existing vault). Kept as a read capability for
consumers that want the rows in a given slot.

Inherits baseVaultConditions, so the result is exactly the recall-live
set for this key: soft-deleted, archived (unless `includeArchived`),
quarantined, superseded, and cross-user rows are all excluded — the same
choke point every other read lane uses. `unsafeFetchRaw` (no Model per row → no
never-evicted RecordCache growth; web Pile-2), then the winners are decrypted
like any other read.

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

`facetKey`

</td>
<td>

`string`

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

`options.includeArchived?`

</td>
<td>

`boolean`

</td>
</tr>
<tr>
<td>

`options.scope?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredVaultMemory`](../interfaces/StoredVaultMemory.md)\[]>
