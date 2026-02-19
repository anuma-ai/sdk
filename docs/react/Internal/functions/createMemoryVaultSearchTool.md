# createMemoryVaultSearchTool

> **createMemoryVaultSearchTool**(`vaultCtx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `embeddingOptions`: [`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md), `cache`: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md), `searchOptions?`: [`MemoryVaultSearchOptions`](../interfaces/MemoryVaultSearchOptions.md)): `ToolConfig`

Defined in: [src/lib/memoryVault/searchTool.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryVault/searchTool.ts#L103)

Creates a memory vault search tool for use with chat completions.

The tool allows the LLM to search through vault memories using semantic
similarity. Vault entries should have their embeddings pre-computed in the
cache (via preEmbedVaultMemories or eagerEmbedContent). Any missing
embeddings are computed on the fly as a fallback.

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

`vaultCtx`

</td>
<td>

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
<td>

Vault operations context for database access

</td>
</tr>
<tr>
<td>

`embeddingOptions`

</td>
<td>

[`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)

</td>
<td>

Options for embedding generation (auth, base URL)

</td>
</tr>
<tr>
<td>

`cache`

</td>
<td>

[`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

</td>
<td>

Pre-populated embedding cache

</td>
</tr>
<tr>
<td>

`searchOptions?`

</td>
<td>

[`MemoryVaultSearchOptions`](../interfaces/MemoryVaultSearchOptions.md)

</td>
<td>

Optional search configuration

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`

A ToolConfig that can be passed to chat completion tools
