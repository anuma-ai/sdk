# mediaItemId

> **mediaItemId**(`store`: `Pick`<[`ChatStore`](../interfaces/ChatStore.md), `"sealedId"`>, `localId`: `string`): `Promise`<`string`>

Defined in: [src/lib/chatStore/media.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/media.ts#120)

The vault record id of a library file: a keyed hash of its device id, so vault cannot tell it and reruns agree on it.

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

`localId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>
