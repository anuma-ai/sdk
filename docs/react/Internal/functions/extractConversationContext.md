# extractConversationContext

> **extractConversationContext**(`messages`: `object`\[], `maxMessages`: `number`): `string`

Defined in: [src/lib/memory/chat.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memory/chat.ts#L105)

Extract conversation context from messages for memory search

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

`messages`

</td>
<td>

`object`\[]

</td>
<td>

`undefined`

</td>
<td>

Array of chat messages

</td>
</tr>
<tr>
<td>

`maxMessages`

</td>
<td>

`number`

</td>
<td>

`3`

</td>
<td>

Maximum number of recent messages to include (default: 3)

</td>
</tr>
</tbody>
</table>

## Returns

`string`

Combined text query for memory search
