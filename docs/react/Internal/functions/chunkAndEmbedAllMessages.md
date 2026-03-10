# chunkAndEmbedAllMessages

> **chunkAndEmbedAllMessages**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `options`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md) & [`ChunkingOptions`](../interfaces/ChunkingOptions.md), `filter?`: `object`): `Promise`<`number`>

Defined in: [src/lib/memoryEngine/embeddings.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#414)

Chunk and embed all messages without embeddings/chunks in the database.
Uses chunking for long messages, whole-message embedding for short ones.

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

`options`

</td>
<td>

[`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md) & [`ChunkingOptions`](../interfaces/ChunkingOptions.md)

</td>
<td>

Embedding and chunking options

</td>
</tr>
<tr>
<td>

`filter?`

</td>
<td>

`object`

</td>
<td>

Optional filter for which messages to embed

</td>
</tr>
<tr>
<td>

`filter.conversationId?`

</td>
<td>

`string`

</td>
<td>

Only embed messages from this conversation

</td>
</tr>
<tr>
<td>

`filter.minContentLength?`

</td>
<td>

`number`

</td>
<td>

Minimum content length to embed (default: 30). Shorter messages are skipped.

</td>
</tr>
<tr>
<td>

`filter.rechunkExisting?`

</td>
<td>

`boolean`

</td>
<td>

Re-chunk messages that have whole-message embeddings but no chunks

</td>
</tr>
<tr>
<td>

`filter.roles?`

</td>
<td>

(`"user"` | `"assistant"`)\[]

</td>
<td>

Only embed messages with these roles

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`number`>

Number of messages embedded
