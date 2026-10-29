# ensureAnumaConversation

> **ensureAnumaConversation**(`store`: [`ChatStore`](../interfaces/ChatStore.md), `options`: `object`): `Promise`<[`ChatSnapshot`](../interfaces/ChatSnapshot.md)>

Defined in: [src/lib/chatStore/anuma.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/anuma.ts#42)

Reads the Anuma conversation, creating it on first use; a device that loses the creation race reads the winner's record.

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

`store`

</td>
<td>

[`ChatStore`](../interfaces/ChatStore.md)

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.now?`

</td>
<td>

() => `number`

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ChatSnapshot`](../interfaces/ChatSnapshot.md)>
