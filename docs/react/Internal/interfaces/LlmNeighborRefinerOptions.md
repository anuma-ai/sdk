# LlmNeighborRefinerOptions

Defined in: [src/lib/memory/graphTraversal.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#360)

Auth + tuning for [createLlmNeighborRefiner](../functions/createLlmNeighborRefiner.md). Reuses the recall
`decomposeOptions` shape (dual auth — one of `apiKey`/`getToken`).

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#85)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### backoffMs()?

> `optional` **backoffMs**: (`attempt`: `number`) => `number`

Defined in: [src/lib/memory/graphTraversal.ts:366](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#366)

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

`attempt`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`number`

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/graphTraversal.ts:361](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#361)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/graphTraversal.ts:363](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#363)

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

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/portalLlm.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#87)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:364](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#364)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/graphTraversal.ts:362](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#362)

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#365)
