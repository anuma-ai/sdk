# UseSearchResult

> **UseSearchResult** = `object`

Defined in: src/react/useSearch.ts:54

## Properties

### error

> **error**: `Error` | `null`

Defined in: src/react/useSearch.ts:62

***

### isLoading

> **isLoading**: `boolean`

Defined in: src/react/useSearch.ts:55

***

### response

> **response**: [`LlmapiSearchResponse`](../../../client/Internal/type-aliases/LlmapiSearchResponse.md) | `null`

Defined in: src/react/useSearch.ts:61

***

### results

> **results**: [`LlmapiSearchResult`](../../../client/Internal/type-aliases/LlmapiSearchResult.md)\[] | `null`

Defined in: src/react/useSearch.ts:60

***

### search()

> **search**: (`query`: `string` | `string`\[], `options?`: `SearchOptions`) => `Promise`<[`LlmapiSearchResponse`](../../../client/Internal/type-aliases/LlmapiSearchResponse.md) | `null`>

Defined in: src/react/useSearch.ts:56

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

`query`

</td>
<td>

`string` | `string`\[]

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

`SearchOptions`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`LlmapiSearchResponse`](../../../client/Internal/type-aliases/LlmapiSearchResponse.md) | `null`>
