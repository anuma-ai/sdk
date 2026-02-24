# chunkAndEmbedMessage

> **chunkAndEmbedMessage**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `messageId`: `string`, `options`: [`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md) & [`ChunkingOptions`](../interfaces/ChunkingOptions.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/memoryRetrieval/embeddings.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryRetrieval/embeddings.ts#L257)

Chunk and embed a single message, storing chunk embeddings in the database.
For messages shorter than chunkSize, falls back to whole-message embedding.

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

`ctx`

</td>
<td>

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

</td>
<td>

Storage operations context

</td>
</tr>
<tr>
<td>

`messageId`

</td>
<td>

`string`

</td>
<td>

Unique ID of the message to chunk and embed

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md) & [`ChunkingOptions`](../interfaces/ChunkingOptions.md)

</td>
<td>

Embedding and chunking options

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

The updated message, or null if message not found
