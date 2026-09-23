# eagerEmbedContent

> **eagerEmbedContent**(`content`: `string`, `embeddingOptions`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md), `cache`: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md), `vaultCtx?`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `memoryId?`: `string`, `updatedAt?`: `Date`): `Promise`<`void`>

Defined in: [src/lib/memoryVault/searchTool.ts:1586](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1586)

Eagerly embed a single piece of content and store it in the cache.
Call this when a vault memory is created or updated.

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

`content`

</td>
<td>

`string`

</td>
<td>

‐

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

‐

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

‐

</td>
</tr>
<tr>
<td>

`vaultCtx?`

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

`memoryId?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`updatedAt?`

</td>
<td>

`Date`

</td>
<td>

`updatedAt` of the committed row this content belongs to. When given, the
cache entry is tied to that row version; without it the entry is
unversioned and a search re-resolves it from the stored column instead of
trusting it (see `vectorVersion.ts`).

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`void`>
