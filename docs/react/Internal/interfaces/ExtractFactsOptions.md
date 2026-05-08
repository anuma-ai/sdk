# ExtractFactsOptions

Defined in: [src/lib/memory/autoExtract.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#100)

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [src/lib/memory/autoExtract.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#101)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/autoExtract.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#102)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/autoExtract.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#105)

Override the global fetch implementation (useful for tests).

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

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/autoExtract.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#103)
