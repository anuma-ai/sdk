# getApiV1SubscriptionsPlans

> **getApiV1SubscriptionsPlans**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1SubscriptionsPlansData`](../type-aliases/GetApiV1SubscriptionsPlansData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1SubscriptionsPlansResponses`](../type-aliases/GetApiV1SubscriptionsPlansResponses.md), [`GetApiV1SubscriptionsPlansErrors`](../type-aliases/GetApiV1SubscriptionsPlansErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:726](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#726)

List available subscription plans

Returns available subscription plans with prices fetched from Stripe.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1SubscriptionsPlansData`](../type-aliases/GetApiV1SubscriptionsPlansData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1SubscriptionsPlansResponses`](../type-aliases/GetApiV1SubscriptionsPlansResponses.md), [`GetApiV1SubscriptionsPlansErrors`](../type-aliases/GetApiV1SubscriptionsPlansErrors.md), `ThrowOnError`>
