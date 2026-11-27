# useWalletBinding

> **useWalletBinding**(`options`: `object`): [`UseWalletBindingResult`](../Internal/type-aliases/UseWalletBindingResult.md)

Defined in: [src/react/useWalletBinding.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/react/useWalletBinding.ts#102)

React hook for managing ZETA wallet bindings and reading staked-based Pro status.
Provides methods to list bound wallets, request a binding nonce, bind a wallet
with a signed proof, and unbind a wallet.

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

Fetch the bound wallets on mount and when the session key changes (default: true).

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
<tr>
<td>

`options.sessionKey?`

</td>
<td>

`string` | `null`

</td>
<td>

A stable account or session ID, or null when the user is signed out.

</td>
</tr>
</tbody>
</table>

## Returns

[`UseWalletBindingResult`](../Internal/type-aliases/UseWalletBindingResult.md)
