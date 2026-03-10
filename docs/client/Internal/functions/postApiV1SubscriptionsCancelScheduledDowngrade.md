# postApiV1SubscriptionsCancelScheduledDowngrade

> **postApiV1SubscriptionsCancelScheduledDowngrade**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCancelScheduledDowngradeData`](../type-aliases/PostApiV1SubscriptionsCancelScheduledDowngradeData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsCancelScheduledDowngradeResponses`](../type-aliases/PostApiV1SubscriptionsCancelScheduledDowngradeResponses.md), [`PostApiV1SubscriptionsCancelScheduledDowngradeErrors`](../type-aliases/PostApiV1SubscriptionsCancelScheduledDowngradeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:630](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#630)

Cancel scheduled downgrade

Cancels a scheduled plan downgrade by releasing the Stripe Subscription Schedule, keeping the current plan active.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsCancelScheduledDowngradeData`](../type-aliases/PostApiV1SubscriptionsCancelScheduledDowngradeData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1SubscriptionsCancelScheduledDowngradeResponses`](../type-aliases/PostApiV1SubscriptionsCancelScheduledDowngradeResponses.md), [`PostApiV1SubscriptionsCancelScheduledDowngradeErrors`](../type-aliases/PostApiV1SubscriptionsCancelScheduledDowngradeErrors.md), `ThrowOnError`>
