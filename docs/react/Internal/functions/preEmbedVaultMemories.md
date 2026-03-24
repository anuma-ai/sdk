# preEmbedVaultMemories

> **preEmbedVaultMemories**(`vaultCtx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `embeddingOptions`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md), `cache`: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md), `options?`: `object`): `Promise`<`void`>

Defined in: [src/lib/memoryVault/searchTool.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#101)

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

`options?`

</td>
<td>

`object`

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

`Promise`<`void`>
