# generateEmbedding

> **generateEmbedding**(`text`: `string`, `options`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)): `Promise`<`number`\[]>

Defined in: [src/lib/memoryEngine/embeddings.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#40)

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

[`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`\[]>
