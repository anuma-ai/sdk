# useSubscription

> **useSubscription**(`options`: `object`): [`UseSubscriptionResult`](../Internal/type-aliases/UseSubscriptionResult.md)

Defined in: [src/react/useSubscription.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L91)

React hook for managing subscription status and billing operations.
Provides methods to check status, upgrade, manage billing, cancel, and renew subscriptions.

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

Whether to fetch subscription status automatically on mount (default: true)

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

[`UseSubscriptionResult`](../Internal/type-aliases/UseSubscriptionResult.md)
