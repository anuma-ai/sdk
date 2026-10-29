# ChatCacheStorage

Defined in: [src/lib/chatStore/vaultCache.ts:4](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultCache.ts#4)

Durable home for each account's sealed chat cache; `set(account, null)` deletes that account's entry.

## Methods

### get()

> **get**(`account`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/chatStore/vaultCache.ts:5](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultCache.ts#5)

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

`account`

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

> **set**(`account`: `string`, `sealed`: `string` | `null`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultCache.ts:6](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultCache.ts#6)

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

`account`

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
