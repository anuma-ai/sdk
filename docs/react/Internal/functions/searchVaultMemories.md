# searchVaultMemories

> **searchVaultMemories**(`query`: `string`, `vaultCtx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `embeddingOptions`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md), `cache`: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md), `searchOptions?`: [`MemoryVaultSearchOptions`](../interfaces/MemoryVaultSearchOptions.md)): `Promise`<[`VaultSearchResult`](../interfaces/VaultSearchResult.md)\[]>

Defined in: [src/lib/memoryVault/searchTool.ts:437](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#437)

Search vault memories by semantic similarity. Returns structured results
sorted by descending similarity, filtered by threshold and limit.

This is the standalone search logic extracted from `createMemoryVaultSearchTool`
so it can be called programmatically (e.g., for pre-retrieval injection).

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`vaultCtx`

</td>
<td>

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
</tr>
<tr>
<td>

`embeddingOptions`

</td>
<td>

[`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)

</td>
</tr>
<tr>
<td>

`cache`

</td>
<td>

[`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

</td>
</tr>
<tr>
<td>

`searchOptions?`

</td>
<td>

[`MemoryVaultSearchOptions`](../interfaces/MemoryVaultSearchOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`VaultSearchResult`](../interfaces/VaultSearchResult.md)\[]>

Sorted results (empty array on invalid input or empty vault)
