# getReferralRewards

> **getReferralRewards**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetReferralRewardsData`](../type-aliases/GetReferralRewardsData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetReferralRewardsResponses`](../type-aliases/GetReferralRewardsResponses.md), [`GetReferralRewardsErrors`](../type-aliases/GetReferralRewardsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:2011](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#2011)

Your referral rewards

The authenticated account's own People Nearby referral rewards: total earned, owed and sent in whole ZETA, the individual grants, and whether a payout can currently reach this account. All amounts are decimal strings because aZETA exceeds the precision of a JSON number. An account that has earned nothing gets 200 with zeros and an empty list.

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

[`Options`](../type-aliases/Options.md)<[`GetReferralRewardsData`](../type-aliases/GetReferralRewardsData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetReferralRewardsResponses`](../type-aliases/GetReferralRewardsResponses.md), [`GetReferralRewardsErrors`](../type-aliases/GetReferralRewardsErrors.md), `ThrowOnError`>
