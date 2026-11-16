# VaultRealtimeOptions

Defined in: [src/lib/vaultRealtime.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#21)

## Properties

### activity?

> `optional` **activity**: `object`

Defined in: [src/lib/vaultRealtime.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#29)

Closes the socket while inactive and reconnects at once when active again.

**isActive()**

> **isActive**(): `boolean`

**Returns**

`boolean`

**subscribe()**

> **subscribe**(`onChange`: () => `void`): () => `void`

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

`onChange`

</td>
<td>

() => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

> (): `void`

**Returns**

`void`

***

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/vaultRealtime.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#23)

Vault's own origin, such as `https://vault.anuma.ai`; the socket is not served on hosts that only share vault's `/api/private-*` routes.

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/vaultRealtime.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#25)

**Call Signature**

> (`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`RequestInfo` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

**Call Signature**

> (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

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

`input`

</td>
<td>

`string` | `Request` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/vaultRealtime.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#24)

**Returns**

`Promise`<`string` | `null`>

***

### retry?

> `optional` **retry**: `object`

Defined in: [src/lib/vaultRealtime.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#30)

**maxMs?**

> `optional` **maxMs**: `number`

**minMs?**

> `optional` **minMs**: `number`

***

### silenceMs?

> `optional` **silenceMs**: `number`

Defined in: [src/lib/vaultRealtime.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#32)

Reconnects when nothing arrives for this long; vault sends a ping every 25 s.

***

### socket?

> `optional` **socket**: [`VaultRealtimeSocketFactory`](../type-aliases/VaultRealtimeSocketFactory.md)

Defined in: [src/lib/vaultRealtime.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#27)

Opens the socket; defaults to the global `WebSocket`.
