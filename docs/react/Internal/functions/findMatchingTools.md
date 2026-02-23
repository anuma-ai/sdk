# findMatchingTools

> **findMatchingTools**(`promptEmbeddings`: `number`\[] | `number`\[]\[], `tools`: [`ServerTool`](../interfaces/ServerTool.md)\[], `options?`: [`ToolMatchOptions`](../interfaces/ToolMatchOptions.md)): [`ToolMatchResult`](../interfaces/ToolMatchResult.md)\[]

Defined in: [src/lib/tools/serverTools.ts:670](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L670)

Find tools that semantically match prompt embedding(s).

Accepts either a single embedding or an array of embeddings (e.g., from chunked messages).
When multiple embeddings are provided, uses max similarity across all chunks for each tool.

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

`promptEmbeddings`

</td>
<td>

`number`\[] | `number`\[]\[]

</td>
<td>

Single embedding vector or array of embeddings (for chunked messages)

</td>
</tr>
<tr>
<td>

`tools`

</td>
<td>

[`ServerTool`](../interfaces/ServerTool.md)\[]

</td>
<td>

Array of server tools (with embeddings) to search through

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`ToolMatchOptions`](../interfaces/ToolMatchOptions.md)

</td>
<td>

Optional matching configuration

</td>
</tr>
</tbody>
</table>

## Returns

[`ToolMatchResult`](../interfaces/ToolMatchResult.md)\[]

Array of matching tools with similarity scores, sorted by relevance

## Example

```ts
// Single embedding
const matches = findMatchingTools(embedding, tools, { limit: 5 });

// Multiple embeddings (chunked message) - uses max similarity
const matches = findMatchingTools(chunkEmbeddings, tools, { limit: 5 });
```
