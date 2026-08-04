# postApiV1AdminSubscriptionTier

> **postApiV1AdminSubscriptionTier**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminSubscriptionTierData`](../type-aliases/PostApiV1AdminSubscriptionTierData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminSubscriptionTierResponses`](../type-aliases/PostApiV1AdminSubscriptionTierResponses.md), [`PostApiV1AdminSubscriptionTierErrors`](../type-aliases/PostApiV1AdminSubscriptionTierErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:396](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#396)

Set user subscription tier

Updates an existing Stripe subscription. Upgrades apply immediately, downgrades and basic-tier cancellations apply at period end. RevenueCat/staking users and users without an active Stripe subscription are rejected. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminSubscriptionTierData`](../type-aliases/PostApiV1AdminSubscriptionTierData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminSubscriptionTierResponses`](../type-aliases/PostApiV1AdminSubscriptionTierResponses.md), [`PostApiV1AdminSubscriptionTierErrors`](../type-aliases/PostApiV1AdminSubscriptionTierErrors.md), `ThrowOnError`>
