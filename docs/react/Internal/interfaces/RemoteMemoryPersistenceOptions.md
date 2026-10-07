# RemoteMemoryPersistenceOptions

Defined in: [src/lib/memory/store/remotePersistence.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#84)

The caller supplies the canonical account key's field encryption on the device.
These callbacks and authentication credentials never enter a request body.
The encryption format must be the SDK's enc:vN:<hex> field format.

## Properties

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#85)

***

### decrypt()

> **decrypt**: (`ciphertext`: `string`) => `Promise`<`string`>

Defined in: [src/lib/memory/store/remotePersistence.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#89)

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

`ciphertext`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>

***

### encrypt()

> **encrypt**: (`plaintext`: `string`) => `Promise`<`string`>

Defined in: [src/lib/memory/store/remotePersistence.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#88)

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

`plaintext`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>

***

### fetch()?

> `optional` **fetch**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/store/remotePersistence.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#90)

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

Defined in: [src/lib/memory/store/remotePersistence.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#86)

**Returns**

`Promise`<`string` | `null`>

***

### keyId

> **keyId**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#87)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/memory/store/remotePersistence.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#92)

Cancellation for the initial account/key check. Individual operations take their own signal.
