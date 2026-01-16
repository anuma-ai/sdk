# createMemoryContextSystemMessage

> **createMemoryContextSystemMessage**(`memories`: [`StoredMemory`](../interfaces/StoredMemory.md) & `object`\[], `baseSystemPrompt?`: `string`): `string`

Defined in: [src/lib/memory/chat.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L80)

Create a system message that includes relevant memories

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

`memories`

</td>
<td>

[`StoredMemory`](../interfaces/StoredMemory.md) & `object`\[]

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

Optional base system prompt (memories will be prepended)

</td>
</tr>
</tbody>
</table>

## Returns

`string`

System message content with memories
