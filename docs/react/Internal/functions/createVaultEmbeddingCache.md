# createVaultEmbeddingCache

> **createVaultEmbeddingCache**(`maxSize`: `number`): [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memoryVault/lruCache.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/lruCache.ts#47)

Create a VaultEmbeddingCache backed by an LRU with a default cap of
DEFAULT\_VAULT\_CACHE\_SIZE entries. Values are Float32Array — the model's
native precision — not float64 number\[], halving resident RAM losslessly.

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
