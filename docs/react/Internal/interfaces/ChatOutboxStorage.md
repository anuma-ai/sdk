# ChatOutboxStorage

Defined in: [src/lib/chatStore/vaultOutbox.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#26)

Durable home for sealed outbox slots, one per running backend, so writes survive a reload while vault is unreachable.

## Methods

### get()

> **get**(`slot`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/chatStore/vaultOutbox.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#28)

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

`slot`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

***

### set()

> **set**(`slot`: `string`, `sealed`: `string` | `null`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultOutbox.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#29)

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

`slot`

</td>
<td>

`string`

</td>
</tr>
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

***

### slots()

> **slots**(): `Promise`<`string`\[]>

Defined in: [src/lib/chatStore/vaultOutbox.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultOutbox.ts#27)

**Returns**

`Promise`<`string`\[]>
