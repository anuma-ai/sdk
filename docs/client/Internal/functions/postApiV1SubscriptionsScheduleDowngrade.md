# postApiV1SubscriptionsScheduleDowngrade

> **postApiV1SubscriptionsScheduleDowngrade**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsScheduleDowngradeData`](../type-aliases/PostApiV1SubscriptionsScheduleDowngradeData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsScheduleDowngradeResponses`](../type-aliases/PostApiV1SubscriptionsScheduleDowngradeResponses.md), [`PostApiV1SubscriptionsScheduleDowngradeErrors`](../type-aliases/PostApiV1SubscriptionsScheduleDowngradeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:454](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#454)

Schedule subscription downgrade

Schedules a plan downgrade (tier or interval) to take effect at the end of the current billing period using Stripe Subscription Schedules.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsScheduleDowngradeData`](../type-aliases/PostApiV1SubscriptionsScheduleDowngradeData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1SubscriptionsScheduleDowngradeResponses`](../type-aliases/PostApiV1SubscriptionsScheduleDowngradeResponses.md), [`PostApiV1SubscriptionsScheduleDowngradeErrors`](../type-aliases/PostApiV1SubscriptionsScheduleDowngradeErrors.md), `ThrowOnError`>
