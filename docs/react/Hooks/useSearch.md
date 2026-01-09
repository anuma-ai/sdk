# useSearch()

> **useSearch**(`options`: { `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onError?`: (`error`: `Error`) => `void`; }): `UseSearchResult`

Defined in: [src/react/useSearch.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSearch.ts#L83)

React hook for performing search operations using the AI SDK.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onError?`: (`error`: `Error`) => `void`; } | Configuration options for the search hook |
| `options.baseUrl?` | `string` | Optional base URL for the API requests. |
| `options.getToken?` | () => `Promise`<`string` | `null`> | Custom function to get auth token for API calls |
| `options.onError?` | (`error`: `Error`) => `void` | Callback function to be called when an error is encountered. |

## Returns

`UseSearchResult`

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
