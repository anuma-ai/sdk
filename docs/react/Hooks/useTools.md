# useTools

> **useTools**(`options`: `object`): [`UseToolsResult`](../Internal/type-aliases/UseToolsResult.md)

Defined in: [src/react/useTools.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/react/useTools.ts#L84)

React hook for fetching and caching server-side tools.

This hook provides:

* Automatic fetching of tools on mount
* Caching with localStorage persistence
* Checksum-based cache invalidation
* Automatic refresh when tools change on the server

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

`object`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.autoFetch?`

</td>
<td>

`boolean`

</td>
<td>

Whether to fetch tools automatically on mount (default: true)

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

`options.getToken`

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

`options.includeTools?`

</td>
<td>

`string`\[]

</td>
<td>

Filter to include only specific tools by name.

* undefined: include all tools
* \[]: include no tools
* \['tool1', 'tool2']: include only named tools

</td>
</tr>
</tbody>
</table>

## Returns

[`UseToolsResult`](../Internal/type-aliases/UseToolsResult.md)

## Example

```tsx
const { tools, checkForUpdates, refresh } = useTools({
  getToken: async () => authToken,
});

// After sending a message, check if tools need refresh
const result = await sendMessage({ messages, model });
checkForUpdates(result.toolsChecksum);
```
