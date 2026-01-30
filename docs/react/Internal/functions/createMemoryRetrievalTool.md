# createMemoryRetrievalTool

> **createMemoryRetrievalTool**(`storageCtx`: `StorageOperationsContext`, `embeddingOptions`: [`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md), `searchOptions?`: `Partial`<[`MemoryRetrievalSearchOptions`](../interfaces/MemoryRetrievalSearchOptions.md)>): `ToolConfig`

Defined in: [src/lib/memoryRetrieval/tool.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/tool.ts#L74)

Creates a memory retrieval tool for use with chat completions.

The tool allows the LLM to search through past conversation messages
using semantic similarity. Messages must have embeddings stored to be searchable.

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

`storageCtx`

</td>
<td>

`StorageOperationsContext`

</td>
<td>

Storage operations context for database access

</td>
</tr>
<tr>
<td>

`embeddingOptions`

</td>
<td>

[`MemoryRetrievalEmbeddingOptions`](../interfaces/MemoryRetrievalEmbeddingOptions.md)

</td>
<td>

Options for embedding generation

</td>
</tr>
<tr>
<td>

`searchOptions?`

</td>
<td>

`Partial`<[`MemoryRetrievalSearchOptions`](../interfaces/MemoryRetrievalSearchOptions.md)>

</td>
<td>

Default search options (can be overridden per-call)

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`

A ToolConfig that can be passed to chat completion tools

## Example

```ts
const tool = createMemoryRetrievalTool(
  storageCtx,
  { getToken: () => getIdentityToken() },
  { limit: 5, minSimilarity: 0.4 }
);

// Use with chat completion
const result = await sendMessage({
  messages: [...],
  tools: [tool],
});
```
