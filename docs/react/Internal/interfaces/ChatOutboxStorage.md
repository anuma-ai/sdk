# ChatOutboxStorage

Defined in: [src/lib/chatStore/vaultOutbox.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#28)

Durable home for the sealed outbox, so writes survive a reload while vault is unreachable.

## Methods

### get()

> **get**(): `Promise`<`string` | `null`>

Defined in: [src/lib/chatStore/vaultOutbox.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#29)

**Returns**

`Promise`<`string` | `null`>

***

### set()

> **set**(`sealed`: `string` | `null`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultOutbox.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#30)

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

`sealed`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>
