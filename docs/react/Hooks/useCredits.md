# useCredits

> **useCredits**(`options?`: `object`): [`UseCreditsResult`](../Internal/type-aliases/UseCreditsResult.md)

Defined in: [src/react/useCredits.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#86)

React hook for managing credits: checking balance, claiming daily credits,
browsing packs, and purchasing credits.

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

Whether to fetch credit balance automatically on mount (default: true)

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

Optional callback for error handling

</td>
</tr>
</tbody>
</table>

## Returns

[`UseCreditsResult`](../Internal/type-aliases/UseCreditsResult.md)
