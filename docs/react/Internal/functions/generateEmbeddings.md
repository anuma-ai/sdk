# generateEmbeddings

> **generateEmbeddings**(`texts`: `string`\[], `options`: [`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)): `Promise`<`number`\[]\[]>

Defined in: [src/lib/memoryRetrieval/embeddings.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryRetrieval/embeddings.ts#95)

Generate embeddings for multiple texts in a single API call

More efficient than calling generateEmbedding multiple times.
Supports the same auth methods as generateEmbedding.

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

[`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)

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
