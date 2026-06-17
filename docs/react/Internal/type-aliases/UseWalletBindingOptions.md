# UseWalletBindingOptions

> **UseWalletBindingOptions** = `object`

Defined in: src/react/useWalletBinding.ts:23

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: src/react/useWalletBinding.ts:35

Whether to fetch the bound wallets automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: src/react/useWalletBinding.ts:31

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: src/react/useWalletBinding.ts:27

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: src/react/useWalletBinding.ts:39

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
