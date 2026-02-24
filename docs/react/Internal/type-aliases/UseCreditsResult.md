# UseCreditsResult

> **UseCreditsResult** = `object`

Defined in: [src/react/useCredits.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#40)

## Properties

### balance

> **balance**: [`HandlersCreditBalanceResponse`](../../../client/Internal/type-aliases/HandlersCreditBalanceResponse.md) | `null`

Defined in: [src/react/useCredits.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#44)

Current credit balance and related info

***

### claimDailyCredits()

> **claimDailyCredits**: () => `Promise`<[`HandlersClaimDailyCreditsResponse`](../../../client/Internal/type-aliases/HandlersClaimDailyCreditsResponse.md) | `null`>

Defined in: [src/react/useCredits.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#69)

Claim free daily credits (once per 24 hours)

**Returns**

`Promise`<[`HandlersClaimDailyCreditsResponse`](../../../client/Internal/type-aliases/HandlersClaimDailyCreditsResponse.md) | `null`>

The claim response or null on error

***

### error

> **error**: `Error` | `null`

Defined in: [src/react/useCredits.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#56)

Error from the last operation

***

### fetchPacks()

> **fetchPacks**: () => `Promise`<`void`>

Defined in: [src/react/useCredits.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#64)

Fetch available credit packs

**Returns**

`Promise`<`void`>

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/react/useCredits.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#52)

Whether any operation is in progress

***

### packs

> **packs**: [`HandlersCreditPack`](../../../client/Internal/type-aliases/HandlersCreditPack.md)\[]

Defined in: [src/react/useCredits.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#48)

Available credit packs for purchase

***

### purchaseCredits()

> **purchaseCredits**: (`credits`: `number`, `options?`: `object`) => `Promise`<`string` | `null`>

Defined in: [src/react/useCredits.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#75)

Create a Stripe checkout session for purchasing a credit pack

**Parameters**

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

`credits`

</td>
<td>

`number`

</td>
<td>

Number of credits to purchase

</td>
</tr>
<tr>
<td>

`options?`

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

`options.cancelUrl?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.successUrl?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

The checkout URL or null on error

***

### refetch()

> **refetch**: () => `Promise`<`void`>

Defined in: [src/react/useCredits.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#60)

Refetch the credit balance

**Returns**

`Promise`<`void`>
