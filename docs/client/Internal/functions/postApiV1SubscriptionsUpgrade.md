# postApiV1SubscriptionsUpgrade

> **postApiV1SubscriptionsUpgrade**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsUpgradeData`](../type-aliases/PostApiV1SubscriptionsUpgradeData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1SubscriptionsUpgradeResponses`](../type-aliases/PostApiV1SubscriptionsUpgradeResponses.md), [`PostApiV1SubscriptionsUpgradeErrors`](../type-aliases/PostApiV1SubscriptionsUpgradeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:726](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#726)

Upgrade subscription

Upgrades the current subscription to a higher tier or from monthly to annual billing by modifying the existing Stripe subscription in-place. No extra credits are allocated for the current month; the new plan's credit amount starts at the next billing cycle.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1SubscriptionsUpgradeData`](../type-aliases/PostApiV1SubscriptionsUpgradeData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1SubscriptionsUpgradeResponses`](../type-aliases/PostApiV1SubscriptionsUpgradeResponses.md), [`PostApiV1SubscriptionsUpgradeErrors`](../type-aliases/PostApiV1SubscriptionsUpgradeErrors.md), `ThrowOnError`>
