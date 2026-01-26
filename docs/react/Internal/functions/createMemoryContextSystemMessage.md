# createMemoryContextSystemMessage

> **createMemoryContextSystemMessage**(`memories`: `MemoryWithScores`\[], `baseSystemPrompt?`: `string`, `format?`: `"compact"` | `"detailed"` | `"grouped"`): `string`

Defined in: [src/lib/memory/chat.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L108)

Create a system message that includes relevant memories

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`memories`

</td>
<td>

`MemoryWithScores`\[]

</td>
<td>

`undefined`

</td>
<td>

Array of memories to include

</td>
</tr>
<tr>
<td>

`baseSystemPrompt?`

</td>
<td>

`string`

</td>
<td>

`undefined`

</td>
<td>

Optional base system prompt (memories will be prepended)

</td>
</tr>
<tr>
<td>

`format?`

</td>
<td>

`"compact"` | `"detailed"` | `"grouped"`

</td>
<td>

`"grouped"`

</td>
<td>

Format style for memories (default: "grouped")

</td>
</tr>
</tbody>
</table>

## Returns

`string`

System message content with memories
