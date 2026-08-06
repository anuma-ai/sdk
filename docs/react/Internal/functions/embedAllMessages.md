# embedAllMessages

> **embedAllMessages**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `options`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md), `filter?`: `object`): `Promise`<`number`>

Defined in: [src/lib/memoryEngine/embeddings.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#180)

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

[`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)

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

`filter.reembedDiscarded?`

</td>
<td>

`boolean`

</td>
<td>

Re-index rows the ciphertext sweep marked [CHUNKS\_DISCARDED\_ORIGIN](../variables/CHUNKS_DISCARDED_ORIGIN.md).
Off by default: this spends the user's own embedding credits, so it belongs
to an explicit user action, never to a background pass. Opens that marker
only — `tool_result` rows stay excluded.

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
