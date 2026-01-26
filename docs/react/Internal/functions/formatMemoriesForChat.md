# formatMemoriesForChat

> **formatMemoriesForChat**(`memories`: `MemoryWithScores`\[], `format`: `"compact"` | `"detailed"` | `"grouped"`): `string`

Defined in: [src/lib/memory/chat.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L43)

Format memories into a context string that can be included in chat messages

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

Array of memories with similarity scores

</td>
</tr>
<tr>
<td>

`format`

</td>
<td>

`"compact"` | `"detailed"` | `"grouped"`

</td>
<td>

`"compact"`

</td>
<td>

Format style: "compact" (simple list), "detailed" (includes relevance scores), or "grouped" (grouped by confidence)

</td>
</tr>
</tbody>
</table>

## Returns

`string`

Formatted string ready to include in system/user message
