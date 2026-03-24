# ClientToolsFilterFn

> **ClientToolsFilterFn** = (`embeddings`: `number`\[] | `number`\[]\[] | `null`, `tools`: [`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]) => `string`\[]

Defined in: [src/lib/db/chat/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#45)

Function type for dynamic client tools filtering based on prompt embeddings.
Receives the prompt embedding(s) (or null for short messages where no embedding
was generated) and all client tools, returns tool names to include.

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

`number`\[] | `number`\[]\[] | `null`

</td>
<td>

Single embedding, array of embeddings, or null (short message)

</td>
</tr>
<tr>
<td>

`tools`

</td>
<td>

[`LlmapiChatCompletionTool`](../../../client/Internal/type-aliases/LlmapiChatCompletionTool.md)\[]

</td>
<td>

All client tools passed to sendMessage

</td>
</tr>
</tbody>
</table>

## Returns

`string`\[]

Array of tool names to include
