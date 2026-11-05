# appFileId

> **appFileId**(`store`: `Pick`<[`ChatStore`](../interfaces/ChatStore.md), `"sealedId"`>, `conversationId`: `string`, `path`: `string`): `Promise`<`string`>

Defined in: [src/lib/chatStore/appFiles.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/appFiles.ts#38)

The vault record id of a conversation's file: a keyed hash, so vault cannot tell the path.

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

`Pick`<[`ChatStore`](../interfaces/ChatStore.md), `"sealedId"`>

</td>
</tr>
<tr>
<td>

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`path`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>
