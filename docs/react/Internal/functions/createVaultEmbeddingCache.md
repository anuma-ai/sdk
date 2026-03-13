# createVaultEmbeddingCache

> **createVaultEmbeddingCache**(`maxSize?`: `number`): [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memoryVault/lruCache.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/lruCache.ts#45)

Create a VaultEmbeddingCache backed by an LRU with a default cap of 1000 entries.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`maxSize`

</td>
<td>

`number`

</td>
<td>

`DEFAULT_VAULT_CACHE_SIZE`

</td>
</tr>
</tbody>
</table>

## Returns

[`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)
