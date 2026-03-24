# searchChunksOp

> **searchChunksOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `queryVector`: `number`\[], `options?`: `object`): `Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:763](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#763)

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

`options.hybridWeights?`

</td>
<td>

`HybridSearchWeights`

</td>
<td>

Weights for semantic vs keyword ranking. Default: 0.7 semantic, 0.3 keyword.

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

`options.queryText?`

</td>
<td>

`string`

</td>
<td>

Original query text for hybrid keyword search. When omitted, only semantic search runs.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>
