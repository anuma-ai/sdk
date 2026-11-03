# VaultInbox

Defined in: [src/lib/chat/inbox.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#32)

The account's vault inbox and the public key portal seals answers to.

## Methods

### list()

> **list**(): `Promise`<[`InboxItem`](../type-aliases/InboxItem.md)\[]>

Defined in: [src/lib/chat/inbox.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#34)

**Returns**

`Promise`<[`InboxItem`](../type-aliases/InboxItem.md)\[]>

***

### putPublicKey()

> **putPublicKey**(`publicKey`: `string`): `Promise`<`void`>

Defined in: [src/lib/chat/inbox.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#33)

**Parameters**

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

`publicKey`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### remove()

> **remove**(`id`: `string`): `Promise`<`void`>

Defined in: [src/lib/chat/inbox.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#35)

**Parameters**

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>
