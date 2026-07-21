# createChunkVectorCache

> **createChunkVectorCache**(`maxSize`: `number`): [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/chunkVectorCache.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/chunkVectorCache.ts#21)

Create a [ChunkVectorCache](../type-aliases/ChunkVectorCache.md) backed by an LRU. Pass the returned cache
into `recall()` (via `RecallContext.chunkCache`) so the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Stale entries self-invalidate on `updated_at` mismatch, so no
explicit invalidation is required beyond clearing it on an encryption-key
reset (wallet switch), mirroring the vault embedding cache.

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

`DEFAULT_CHUNK_CACHE_SIZE`

</td>
</tr>
</tbody>
</table>

## Returns

[`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)
