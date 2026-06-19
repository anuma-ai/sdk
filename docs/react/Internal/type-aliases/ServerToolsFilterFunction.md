# ServerToolsFilterFunction

> **ServerToolsFilterFunction** = (`embeddings`: `number`\[] | `number`\[]\[], `tools`: [`ServerTool`](../interfaces/ServerTool.md)\[]) => `string`\[]

Defined in: [src/lib/tools/serverTools.ts:1436](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1436)

Type for a server-tools filter — a function that takes prompt embeddings
and the full server tool catalog and returns the names of tools to keep.
Matches `useChatStorage`'s `serverTools` callback signature.

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

`embeddings`

</td>
<td>

`number`\[] | `number`\[]\[]

</td>
</tr>
<tr>
<td>

`tools`

</td>
<td>

[`ServerTool`](../interfaces/ServerTool.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

`string`\[]
