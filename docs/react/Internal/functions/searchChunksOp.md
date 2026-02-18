# searchChunksOp

> **searchChunksOp**(`ctx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `queryVector`: `number`\[], `options?`: `object`): `Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>

Defined in: [src/lib/db/chat/operations.ts:690](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/operations.ts#L690)

Search through message chunks for fine-grained semantic search.
Returns the matching chunk text along with the parent message.

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

`ctx`

</td>
<td>

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

</td>
</tr>
<tr>
<td>

`queryVector`

</td>
<td>

`number`\[]

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.conversationId?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options.limit?`

</td>
<td>

`number`

</td>
</tr>
<tr>
<td>

`options.minSimilarity?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ChunkSearchResult`](../interfaces/ChunkSearchResult.md)\[]>
