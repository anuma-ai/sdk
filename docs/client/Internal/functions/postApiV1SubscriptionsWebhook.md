# postApiV1SubscriptionsWebhook

> **postApiV1SubscriptionsWebhook**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsWebhookData`](../type-aliases/PostApiV1SubscriptionsWebhookData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsWebhookResponses`](../type-aliases/PostApiV1SubscriptionsWebhookResponses.md), [`PostApiV1SubscriptionsWebhookErrors`](../type-aliases/PostApiV1SubscriptionsWebhookErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:362](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L362)

Handle Stripe webhook

Receives and processes Stripe webhook events for subscription lifecycle management

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsWebhookData`](../type-aliases/PostApiV1SubscriptionsWebhookData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1SubscriptionsWebhookResponses`](../type-aliases/PostApiV1SubscriptionsWebhookResponses.md), [`PostApiV1SubscriptionsWebhookErrors`](../type-aliases/PostApiV1SubscriptionsWebhookErrors.md), `ThrowOnError`>
