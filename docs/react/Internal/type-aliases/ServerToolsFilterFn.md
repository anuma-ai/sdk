# ServerToolsFilterFn

> **ServerToolsFilterFn** = (`embeddings`: `number`\[] | `number`\[]\[], `tools`: [`ServerTool`](../interfaces/ServerTool.md)\[]) => `string`\[]

Defined in: [src/lib/db/chat/types.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#L23)

Function type for dynamic server tools filtering based on prompt embeddings.
Receives the prompt embedding(s) and all available tools, returns tool names to include.

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

`embeddings`

</td>
<td>

`number`\[] | `number`\[]\[]

</td>
<td>

Single embedding or array of embeddings (for chunked messages)

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

All available server tools with embeddings

</td>
</tr>
</tbody>
</table>

## Returns

`string`\[]

Array of tool names to include
