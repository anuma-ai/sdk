# embedMessage

> **embedMessage**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `messageId`: `string`, `options`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)): `Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

Defined in: [src/lib/memoryEngine/embeddings.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#193)

Embed a single message and store the embedding in the database

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

Unique ID of the message to embed

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

`Promise`<[`StoredMessage`](../interfaces/StoredMessage.md) | `null`>

The updated message with embedding, or null if message not found
