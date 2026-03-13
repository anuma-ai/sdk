# usePhoneCalls

> **usePhoneCalls**(`options?`: `object`): [`UsePhoneCallsResult`](../Internal/type-aliases/UsePhoneCallsResult.md)

Defined in: [src/react/usePhoneCalls.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#146)

React hook for phone calling: checking availability, creating calls,
fetching their status, and polling for completion.

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

`options.autoFetchAvailability?`

</td>
<td>

`boolean`

</td>
<td>

Whether to fetch feature availability automatically on mount (default: true)

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

[`UsePhoneCallsResult`](../Internal/type-aliases/UsePhoneCallsResult.md)
