# PlatformStorage

Defined in: [src/lib/db/manager.ts:18](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L18)

Platform abstraction for persistent and session storage.

Web implementations use localStorage/sessionStorage/indexedDB.
Mobile implementations can use AsyncStorage/in-memory maps/SQLite cleanup.

## Methods

### deleteDatabase()

> **deleteDatabase**(`name`: `string`): `Promise`<`void`>

Defined in: [src/lib/db/manager.ts:30](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L30)

Delete an IndexedDB database by name

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

`name`

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

### getItem()

> **getItem**(`key`: `string`): `string` | `null`

Defined in: [src/lib/db/manager.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L20)

Read a value from persistent storage (e.g. localStorage)

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

`string` | `null`

***

### getSessionItem()

> **getSessionItem**(`key`: `string`): `string` | `null`

Defined in: [src/lib/db/manager.ts:26](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L26)

Read a value from session-scoped storage (e.g. sessionStorage). Used to prevent reload loops.

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

`string` | `null`

***

### removeItem()

> **removeItem**(`key`: `string`): `void`

Defined in: [src/lib/db/manager.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L24)

Remove a value from persistent storage

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

`void`

***

### setItem()

> **setItem**(`key`: `string`, `value`: `string`): `void`

Defined in: [src/lib/db/manager.ts:22](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L22)

Write a value to persistent storage

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

`value`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### setSessionItem()

> **setSessionItem**(`key`: `string`, `value`: `string`): `void`

Defined in: [src/lib/db/manager.ts:28](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L28)

Write a value to session-scoped storage

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

`value`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
