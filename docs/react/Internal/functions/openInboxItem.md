# openInboxItem

> **openInboxItem**(`item`: `Pick`<[`InboxItem`](../type-aliases/InboxItem.md), `"id"` | `"sealed"`>, `keyPair`: `CryptoKeyPair`): `Promise`<[`InboxPlaintext`](../type-aliases/InboxPlaintext.md)>

Defined in: [src/lib/chat/inbox.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#97)

Decrypt a sealed inbox item with the account's ECDH key pair.

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

`item`

</td>
<td>

`Pick`<[`InboxItem`](../type-aliases/InboxItem.md), `"id"` | `"sealed"`>

</td>
</tr>
<tr>
<td>

`keyPair`

</td>
<td>

`CryptoKeyPair`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`InboxPlaintext`](../type-aliases/InboxPlaintext.md)>
