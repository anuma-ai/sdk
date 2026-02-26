# generateEmbedding

> **generateEmbedding**(`text`: `string`, `options`: [`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)): `Promise`<`number`\[]>

Defined in: [src/lib/memoryRetrieval/embeddings.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryRetrieval/embeddings.ts#41)

Generate an embedding for text using the API

Supports two auth methods:

* `apiKey`: Uses X-API-Key header (for server-side/CLI usage)
* `getToken`: Uses Authorization: Bearer header (for Privy identity tokens)

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

`text`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`\[]>
