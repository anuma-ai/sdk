# UseWalletBindingOptions

> **UseWalletBindingOptions** = `object`

Defined in: [src/react/useWalletBinding.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/react/useWalletBinding.ts#25)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useWalletBinding.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/react/useWalletBinding.ts#37)

Fetch the bound wallets on mount and when the session key changes (default: true).

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useWalletBinding.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/react/useWalletBinding.ts#33)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useWalletBinding.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/react/useWalletBinding.ts#29)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/react/useWalletBinding.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/react/useWalletBinding.ts#41)

Optional callback for error handling

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

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### sessionKey?

> `optional` **sessionKey**: `string` | `null`

Defined in: [src/react/useWalletBinding.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/react/useWalletBinding.ts#43)

A stable account or session ID, or null when the user is signed out.
