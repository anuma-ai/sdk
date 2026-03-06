# postApiV1SubscriptionsCancel

> **postApiV1SubscriptionsCancel**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCancelData`](../type-aliases/PostApiV1SubscriptionsCancelData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsCancelResponses`](../type-aliases/PostApiV1SubscriptionsCancelResponses.md), [`PostApiV1SubscriptionsCancelErrors`](../type-aliases/PostApiV1SubscriptionsCancelErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:646](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#646)

Cancel subscription

Cancels the user's subscription at the end of the current billing period (cancel\_at\_period\_end)

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

`options?`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCancelData`](../type-aliases/PostApiV1SubscriptionsCancelData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1SubscriptionsCancelResponses`](../type-aliases/PostApiV1SubscriptionsCancelResponses.md), [`PostApiV1SubscriptionsCancelErrors`](../type-aliases/PostApiV1SubscriptionsCancelErrors.md), `ThrowOnError`>
