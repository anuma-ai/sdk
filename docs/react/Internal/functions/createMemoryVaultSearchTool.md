# createMemoryVaultSearchTool

> **createMemoryVaultSearchTool**(`vaultCtx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `embeddingOptions`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md), `cache`: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md), `searchOptions?`: [`MemoryVaultSearchOptions`](../interfaces/MemoryVaultSearchOptions.md)): `ToolConfig`

Defined in: [src/lib/memoryVault/searchTool.ts:1101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1101)

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

[`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)

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
