# searchChunksOp

> **searchChunksOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `queryVector`: `number`\[], `options?`: `object`): `Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:1383](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1383)

Search through message chunks for fine-grained semantic search.
Returns the matching chunk text along with the parent message.

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

‐

</td>
</tr>
<tr>
<td>

`queryVector`

</td>
<td>

`number`\[]

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.conversationId?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.embeddingModel?`

</td>
<td>

`string`

</td>
<td>

Current embedding model. When set, messages whose stored
`embedding_model` is non-null and differs are skipped — their vectors
live in a different space, so cosine against the current-model query is
meaningless (and the dim-mismatch path returns 0 silently). Null/absent
`embedding_model` is grandfathered as current-model-compatible. Skipped
messages are re-embedded out-of-band by `chunkAndEmbedAllMessages`.

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.minSimilarity?`

</td>
<td>

`number`

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>
