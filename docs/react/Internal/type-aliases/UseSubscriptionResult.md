# UseSubscriptionResult

> **UseSubscriptionResult** = `object`

Defined in: [src/react/useSubscription.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L40)

## Properties

### cancelSubscription()

> **cancelSubscription**: () => `Promise`<[`HandlersCancelSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersCancelSubscriptionResponse.md) | `null`>

Defined in: [src/react/useSubscription.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L76)

Cancel the subscription at the end of the current period

**Returns**

`Promise`<[`HandlersCancelSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersCancelSubscriptionResponse.md) | `null`>

The cancellation response or null on error

***

### createCheckoutSession()

> **createCheckoutSession**: (`options?`: `object`) => `Promise`<`string` | `null`>

Defined in: [src/react/useSubscription.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L61)

Create a Stripe checkout session for upgrading to Pro

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

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.cancelUrl?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options.successUrl?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

The checkout URL or null on error

***

### error

> **error**: `Error` | `null`

Defined in: [src/react/useSubscription.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L52)

Error from the last operation

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/react/useSubscription.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L48)

Whether any operation is in progress

***

### openCustomerPortal()

> **openCustomerPortal**: (`options?`: `object`) => `Promise`<`string` | `null`>

Defined in: [src/react/useSubscription.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L69)

Open the Stripe customer portal for managing billing

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

`options?`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.returnUrl?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

The portal URL or null on error

***

### refetch()

> **refetch**: () => `Promise`<`void`>

Defined in: [src/react/useSubscription.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L56)

Refetch the subscription status

**Returns**

`Promise`<`void`>

***

### renewSubscription()

> **renewSubscription**: () => `Promise`<[`HandlersRenewSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersRenewSubscriptionResponse.md) | `null`>

Defined in: [src/react/useSubscription.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L81)

Reactivate a cancelled subscription

**Returns**

`Promise`<[`HandlersRenewSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersRenewSubscriptionResponse.md) | `null`>

The renewal response or null on error

***

### status

> **status**: [`HandlersSubscriptionStatusResponse`](../../../client/Internal/type-aliases/HandlersSubscriptionStatusResponse.md) | `null`

Defined in: [src/react/useSubscription.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSubscription.ts#L44)

Current subscription status
