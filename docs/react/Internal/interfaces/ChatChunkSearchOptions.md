# ChatChunkSearchOptions

Defined in: [src/lib/storage/ChatBackend.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#20)

## Properties

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/storage/ChatBackend.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#26)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/storage/ChatBackend.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#23)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/storage/ChatBackend.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#25)

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/storage/ChatBackend.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#24)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/storage/ChatBackend.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#21)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/storage/ChatBackend.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#22)

***

### onStats()?

> `optional` **onStats**: (`stats`: [`ChunkSearchStats`](ChunkSearchStats.md)) => `void`

Defined in: [src/lib/storage/ChatBackend.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatBackend.ts#27)

**Parameters**

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

`stats`

</td>
<td>

[`ChunkSearchStats`](ChunkSearchStats.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
