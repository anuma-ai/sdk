# formatMemoriesForChat

> **formatMemoriesForChat**(`memories`: [`StoredMemory`](../interfaces/StoredMemory.md) & `object`\[], `format`: `"compact"` | `"detailed"`): `string`

Defined in: [src/lib/memory/chat.ts:9](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L9)

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

[`StoredMemory`](../interfaces/StoredMemory.md) & `object`\[]

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

`"compact"` | `"detailed"`

</td>
<td>

`"compact"`

</td>
<td>

Format style: "compact" (key-value pairs) or "detailed" (includes evidence)

</td>
</tr>
</tbody>
</table>

## Returns

`string`

Formatted string ready to include in system/user message
