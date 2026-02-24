# UseSubscriptionResult

> **UseSubscriptionResult** = `object`

Defined in: [src/react/useSubscription.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#41)

## Properties

### cancelSubscription()

> **cancelSubscription**: () => `Promise`<[`HandlersCancelSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersCancelSubscriptionResponse.md) | `null`>

Defined in: [src/react/useSubscription.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#77)

Cancel the subscription at the end of the current period

**Returns**

`Promise`<[`HandlersCancelSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersCancelSubscriptionResponse.md) | `null`>

The cancellation response or null on error

***

### createCheckoutSession()

> **createCheckoutSession**: (`options?`: `object`) => `Promise`<`string` | `null`>

Defined in: [src/react/useSubscription.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#62)

Create a Stripe checkout session for a subscription plan

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

`options.interval?`

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
<tr>
<td>

`options.tier?`

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

Defined in: [src/react/useSubscription.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#53)

Error from the last operation

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/react/useSubscription.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#49)

Whether any operation is in progress

***

### openCustomerPortal()

> **openCustomerPortal**: (`options?`: `object`) => `Promise`<`string` | `null`>

Defined in: [src/react/useSubscription.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#72)

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

Defined in: [src/react/useSubscription.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#57)

Refetch the subscription status

**Returns**

`Promise`<`void`>

***

### renewSubscription()

> **renewSubscription**: () => `Promise`<[`HandlersRenewSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersRenewSubscriptionResponse.md) | `null`>

Defined in: [src/react/useSubscription.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#82)

Reactivate a cancelled subscription

**Returns**

`Promise`<[`HandlersRenewSubscriptionResponse`](../../../client/Internal/type-aliases/HandlersRenewSubscriptionResponse.md) | `null`>

The renewal response or null on error

***

### status

> **status**: [`HandlersSubscriptionStatusResponse`](../../../client/Internal/type-aliases/HandlersSubscriptionStatusResponse.md) | `null`

Defined in: [src/react/useSubscription.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#45)

Current subscription status
