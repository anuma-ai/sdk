# useSearch()

> **useSearch**(`options`): `UseSearchResult`

Defined in: [react/useSearch.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSearch.ts#L80)

React hook for performing search operations using the AI SDK.

## Parameters

### options

`UseSearchOptions` = `{}`

Configuration options for the search hook

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
