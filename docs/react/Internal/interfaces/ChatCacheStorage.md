# ChatCacheStorage

Defined in: [src/lib/chatStore/vaultCache.ts:6](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultCache.ts#6)

Stores sealed values at account and `<account>/chat-cache/<uuid>` keys; `set(key, null)` deletes only that key, and `keys(prefix)` lets the cache delete slots no index names.

## Methods

### get()

> **get**(`key`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/chatStore/vaultCache.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultCache.ts#7)

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

`key`

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

### keys()?

> `optional` **keys**(`prefix`: `string`): `Promise`<`string`\[]>

Defined in: [src/lib/chatStore/vaultCache.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultCache.ts#9)

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

`prefix`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>

***

### set()

> **set**(`key`: `string`, `sealed`: `string` | `null`): `Promise`<`void`>

Defined in: [src/lib/chatStore/vaultCache.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/vaultCache.ts#8)

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

`key`

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
