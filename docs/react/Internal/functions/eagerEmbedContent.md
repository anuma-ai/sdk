# eagerEmbedContent

> **eagerEmbedContent**(`content`: `string`, `embeddingOptions`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md), `cache`: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)): `Promise`<`void`>

Defined in: [src/lib/memoryVault/searchTool.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#83)

Eagerly embed a single piece of content and store it in the cache.
Call this when a vault memory is created or updated.

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

`content`

</td>
<td>

`string`

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
</tbody>
</table>

## Returns

`Promise`<`void`>
