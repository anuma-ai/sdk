# createMemoryEngineTool

> **createMemoryEngineTool**(`storageCtx`: [`StorageOperationsContext`](../interfaces/StorageOperationsContext.md), `embeddingOptions`: [`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md), `searchOptions?`: `Partial`<[`MemoryEngineSearchOptions`](../interfaces/MemoryEngineSearchOptions.md)>, `callbacks?`: `object`): `ToolConfig`

Defined in: [src/lib/memoryEngine/tool.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/tool.ts#93)

Creates a memory engine tool for use with chat completions.

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

[`StorageOperationsContext`](../interfaces/StorageOperationsContext.md)

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

[`MemoryEngineEmbeddingOptions`](../interfaces/MemoryEngineEmbeddingOptions.md)

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

`Partial`<[`MemoryEngineSearchOptions`](../interfaces/MemoryEngineSearchOptions.md)>

</td>
<td>

Default search options (can be overridden per-call)

</td>
</tr>
<tr>
<td>

`callbacks?`

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

`callbacks.onRetrieve?`

</td>
<td>

(`conversationIds`: `string`\[]) => `void`

</td>
<td>

Called after retrieval with the conversation IDs that were actually returned to the LLM.

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`

A ToolConfig that can be passed to chat completion tools

## Example

```ts
const tool = createMemoryEngineTool(
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
