# LlmNeighborRefinerOptions

Defined in: [src/lib/memory/graphTraversal.ts:381](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#381)

Auth + tuning for [createLlmNeighborRefiner](../functions/createLlmNeighborRefiner.md). Reuses the recall
`decomposeOptions` shape (dual auth — one of `apiKey`/`getToken`).

## Extends

* [`PortalLlmAuth`](PortalLlmAuth.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#114)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`apiKey`](PortalLlmAuth.md#apikey)

***

### backoffMs()?

> `optional` **backoffMs**: (`attempt`: `number`) => `number`

Defined in: [src/lib/memory/graphTraversal.ts:387](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#387)

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

Defined in: [src/lib/memory/graphTraversal.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#382)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/graphTraversal.ts:384](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#384)

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

Defined in: [src/lib/memory/portalLlm.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#116)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

[`PortalLlmAuth`](PortalLlmAuth.md).[`getToken`](PortalLlmAuth.md#gettoken)

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:385](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#385)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/graphTraversal.ts:383](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#383)

***

### totalTimeoutMs?

> `optional` **totalTimeoutMs**: `number`

Defined in: [src/lib/memory/graphTraversal.ts:386](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/graphTraversal.ts#386)
