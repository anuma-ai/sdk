# searchChunksOp

> **searchChunksOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `queryVector`: `number`\[], `options?`: `object`): `Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:1714](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1714)

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

`options.chunkCache?`

</td>
<td>

[`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

</td>
<td>

Decrypted-vector cache, validated by `updated_at`.

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

Current embedding model; messages stored under a different non-null model are skipped.

</td>
</tr>
<tr>
<td>

`options.excludeConversationId?`

</td>
<td>

`string`

</td>
<td>

Skip every message in this conversation before scoring.

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
<tr>
<td>

`options.onStats?`

</td>
<td>

(`stats`: [`ChunkSearchStats`](../interfaces/ChunkSearchStats.md)) => `void`

</td>
<td>

Receives row counts for the call.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>
