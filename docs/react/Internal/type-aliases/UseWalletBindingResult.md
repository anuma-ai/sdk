# UseWalletBindingResult

> **UseWalletBindingResult** = `object`

Defined in: src/react/useWalletBinding.ts:42

## Properties

### bindWallet()

> **bindWallet**: (`request`: [`HandlersBindRequest`](../../../client/Internal/type-aliases/HandlersBindRequest.md)) => `Promise`<[`HandlersBoundWalletResponse`](../../../client/Internal/type-aliases/HandlersBoundWalletResponse.md) | `null`>

Defined in: src/react/useWalletBinding.ts:79

Bind a wallet to the account using a signed nonce proof. Refetches on success.

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

`request`

</td>
<td>

[`HandlersBindRequest`](../../../client/Internal/type-aliases/HandlersBindRequest.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`HandlersBoundWalletResponse`](../../../client/Internal/type-aliases/HandlersBoundWalletResponse.md) | `null`>

The bound wallet or null on error

***

### error

> **error**: `Error` | `null`

Defined in: src/react/useWalletBinding.ts:64

Error from the last operation

***

### getNonce()

> **getNonce**: () => `Promise`<[`HandlersNonceResponse`](../../../client/Internal/type-aliases/HandlersNonceResponse.md) | `null`>

Defined in: src/react/useWalletBinding.ts:74

Request a binding nonce. The returned `message` is what the wallet must sign
to prove ownership before calling [bindWallet](#bindwallet).

**Returns**

`Promise`<[`HandlersNonceResponse`](../../../client/Internal/type-aliases/HandlersNonceResponse.md) | `null`>

The nonce response or null on error

***

### isLoading

> **isLoading**: `boolean`

Defined in: src/react/useWalletBinding.ts:60

Whether any operation is in progress

***

### pro

> **pro**: [`HandlersProInfo`](../../../client/Internal/type-aliases/HandlersProInfo.md) | `null`

Defined in: src/react/useWalletBinding.ts:56

Convenience accessor for the Pro gate (`totals.pro`). Trust `pro_active` for
the authoritative state — it holds through the grace window even if
`qualified` dips below the threshold.

***

### refetch()

> **refetch**: () => `Promise`<`void`>

Defined in: src/react/useWalletBinding.ts:68

Refetch the bound wallets and totals.

**Returns**

`Promise`<`void`>

***

### totals

> **totals**: [`HandlersListTotals`](../../../client/Internal/type-aliases/HandlersListTotals.md) | `null`

Defined in: src/react/useWalletBinding.ts:50

Aggregate totals across all bound wallets (summed staked ZETA + Pro status).

***

### unbindWallet()

> **unbindWallet**: (`address`: `string`) => `Promise`<`boolean`>

Defined in: src/react/useWalletBinding.ts:84

Unbind a wallet by its address (`0x…` or `zeta1…`). Refetches on success.

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

`address`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

true on success, false on error

***

### wallets

> **wallets**: [`HandlersBoundWalletResponse`](../../../client/Internal/type-aliases/HandlersBoundWalletResponse.md)\[]

Defined in: src/react/useWalletBinding.ts:46

The account's bound wallets, each with its on-chain staked amount.
