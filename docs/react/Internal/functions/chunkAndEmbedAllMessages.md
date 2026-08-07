# chunkAndEmbedAllMessages

> **chunkAndEmbedAllMessages**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `options`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md) & [`ChunkingOptions`](../interfaces/ChunkingOptions.md), `filter?`: `object`): `Promise`<`number`>

Defined in: [src/lib/memoryEngine/embeddings.ts:395](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#395)

Chunk and embed messages that don't yet have embeddings/chunks in the
database. Uses chunking for long messages, whole-message embedding for short
ones.

Upgrade note: by default this SKIPS messages that already have a whole-message
vector. An app migrating from whole-message embeddings to chunk-based search
must pass `filter.rechunkExisting: true` to (re)chunk those existing messages
— otherwise they get no chunk rows and chunk search stays incomplete for the
back-catalog.

Requires embedding auth (`apiKey` or `getToken` in `options`; see
[EmbeddingOptions](../interfaces/MemoryEngineEmbeddingOptions.md)) — rejects with `"Either apiKey or getToken must be
provided"` if neither is set.

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

Embedding and chunking options (auth required — see above)

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

`rechunkExisting` cannot substitute for it: a discarded row has neither
chunks nor vector, so it never reaches that check and falls straight to the
origin gate.

Per call, not a state change: a row that re-indexes successfully keeps its
marker, so a later pass that omits this flag skips it again. See
[CHUNKS\_DISCARDED\_ORIGIN](../variables/CHUNKS_DISCARDED_ORIGIN.md).

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
