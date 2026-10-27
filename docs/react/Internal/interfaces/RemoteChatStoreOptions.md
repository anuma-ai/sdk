# RemoteChatStoreOptions

Defined in: [src/lib/chatStore/types.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#148)

## Properties

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/chatStore/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#149)

***

### decrypt()

> **decrypt**: (`ciphertext`: `string`) => `Promise`<`string`>

Defined in: [src/lib/chatStore/types.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#153)

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

Defined in: [src/lib/chatStore/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#152)

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

Defined in: [src/lib/chatStore/types.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#154)

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

Defined in: [src/lib/chatStore/types.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#150)

**Returns**

`Promise`<`string` | `null`>

***

### keyId

> **keyId**: `string`

Defined in: [src/lib/chatStore/types.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#151)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#156)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/chatStore/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#155)
