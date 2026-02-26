# embedAllMessages

> **embedAllMessages**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `options`: [`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md), `filter?`: `object`): `Promise`<`number`>

Defined in: [src/lib/memoryRetrieval/embeddings.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryRetrieval/embeddings.ts#232)

Embed all messages without embeddings in the database

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

[`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)

</td>
<td>

Embedding options

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
