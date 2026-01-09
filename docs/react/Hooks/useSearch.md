# useSearch

> **useSearch**(`options`: `object`): [`UseSearchResult`](../Internal/type-aliases/UseSearchResult.md)

Defined in: [src/react/useSearch.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSearch.ts#L83)

React hook for performing search operations using the AI SDK.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

{ `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onError?`: (`error`: `Error`) => `void`; }

</td>
<td>

Configuration options for the search hook

</td>
</tr>
<tr>
<td>

`options.baseUrl?`

</td>
<td>

`string`

</td>
<td>

Optional base URL for the API requests.

</td>
</tr>
<tr>
<td>

`options.getToken?`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

Custom function to get auth token for API calls

</td>
</tr>
<tr>
<td>

`options.onError?`

</td>
<td>

(`error`: `Error`) => `void`

</td>
<td>

Callback function to be called when an error is encountered.

</td>
</tr>
</tbody>
</table>

## Returns

[`UseSearchResult`](../Internal/type-aliases/UseSearchResult.md)

Object containing search function, results, loading state, and error

## Example

```tsx
const { search, results, isLoading } = useSearch({
  getToken: async () => "my-token"
});

const handleSearch = async () => {
  await search("What is ZetaChain?");
};
```
