# RemoteChatStoreOptions

Defined in: [src/lib/chatStore/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#165)

## Properties

### baseUrl

> **baseUrl**: `string`

Defined in: [src/lib/chatStore/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#166)

***

### decrypt()

> **decrypt**: (`ciphertext`: `string`) => `Promise`<`string`>

Defined in: [src/lib/chatStore/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#170)

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

Defined in: [src/lib/chatStore/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#169)

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

Defined in: [src/lib/chatStore/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#172)

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

Defined in: [src/lib/chatStore/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#167)

**Returns**

`Promise`<`string` | `null`>

***

### hashTopic()?

> `optional` **hashTopic**: (`normalized`: `string`) => `Promise`<`string`>

Defined in: [src/lib/chatStore/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#171)

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

`normalized`

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

### keyId

> **keyId**: `string`

Defined in: [src/lib/chatStore/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#168)

***

### signal?

> `optional` **signal**: `AbortSignal`

Defined in: [src/lib/chatStore/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#174)

***

### timeoutMs?

> `optional` **timeoutMs**: `number`

Defined in: [src/lib/chatStore/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/chatStore/types.ts#173)
