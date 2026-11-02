# createVaultInbox

> **createVaultInbox**(`options`: `object`): [`VaultInbox`](../interfaces/VaultInbox.md)

Defined in: [src/lib/chat/inbox.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#67)

The vault inbox client, under the same `/api/private-chats` routes as the chat store.

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

`options`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.baseUrl`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options.fetch?`

</td>
<td>

{(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

</td>
</tr>
<tr>
<td>

`options.getToken`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
</tr>
<tr>
<td>

`options.timeoutMs?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

## Returns

[`VaultInbox`](../interfaces/VaultInbox.md)
