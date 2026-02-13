# preEmbedVaultMemories

> **preEmbedVaultMemories**(`vaultCtx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `embeddingOptions`: [`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md), `cache`: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)): `Promise`<`void`>

Defined in: [src/lib/memoryVault/searchTool.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryVault/searchTool.ts#L62)

Pre-embed all vault memories that are not yet in the cache.
Call this at init time so searches are instant.

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

[`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)

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
</tbody>
</table>

## Returns

`Promise`<`void`>
