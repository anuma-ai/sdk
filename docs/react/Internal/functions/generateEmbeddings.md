# generateEmbeddings

> **generateEmbeddings**(`texts`: `string`\[], `options`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)): `Promise`<`number`\[]\[]>

Defined in: [src/lib/memoryEngine/embeddings.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#159)

Generate embeddings for multiple texts, automatically chunking large inputs.

More efficient than calling generateEmbedding multiple times.
Supports the same auth methods as generateEmbedding.
For inputs larger than batchSize (default 100), splits into chunks
processed with bounded concurrency (3 concurrent batches).

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

`texts`

</td>
<td>

`string`\[]

</td>
<td>

Array of texts to embed

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)

</td>
<td>

Embedding options

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`\[]\[]>

Array of embeddings in the same order as input texts
