# postApiV1SubscriptionsCreateCheckoutSession

> **postApiV1SubscriptionsCreateCheckoutSession**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCreateCheckoutSessionData`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsCreateCheckoutSessionResponses`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionResponses.md), [`PostApiV1SubscriptionsCreateCheckoutSessionErrors`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:398](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#398)

Create checkout session

Creates a Stripe Checkout Session for a subscription plan and returns the checkout URL. Identify the plan with either price\_id directly, or tier ("starter"/"pro") + interval ("month"/"year").

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ThrowOnError` *extends* `boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

## Parameters

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

`options`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCreateCheckoutSessionData`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1SubscriptionsCreateCheckoutSessionResponses`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionResponses.md), [`PostApiV1SubscriptionsCreateCheckoutSessionErrors`](../type-aliases/PostApiV1SubscriptionsCreateCheckoutSessionErrors.md), `ThrowOnError`>
