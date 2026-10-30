# countUnreadAnumaTurns

> **countUnreadAnumaTurns**(`messages`: readonly `Pick`<[`StoredMessage`](../interfaces/StoredMessage.md), `"uniqueId"` | `"role"` | `"anuma"` | `"messageId"`>\[], `lastReadSortKey`: `number`): `number`

Defined in: [src/lib/chatStore/anuma.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/anuma.ts#117)

Counts Anuma turns the user has not read: assistant turns above both the read marker and the user's latest message.

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

`messages`

</td>
<td>

readonly `Pick`<[`StoredMessage`](../interfaces/StoredMessage.md), `"uniqueId"` | `"role"` | `"anuma"` | `"messageId"`>\[]

</td>
</tr>
<tr>
<td>

`lastReadSortKey`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

`number`
