# useModels

> **useModels**(`options?`: `object`): [`UseModelsResult`](../Internal/type-aliases/UseModelsResult.md)

Defined in: [src/react/useModels.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#43)

React hook for fetching available LLM models.
Automatically fetches all available models.

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

Whether to fetch models automatically on mount (default: true)

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

`options.provider?`

</td>
<td>

`string`

</td>
<td>

Optional filter for specific provider (e.g. "openai")

</td>
</tr>
</tbody>
</table>

## Returns

[`UseModelsResult`](../Internal/type-aliases/UseModelsResult.md)
