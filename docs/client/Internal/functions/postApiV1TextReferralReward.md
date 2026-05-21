# postApiV1TextReferralReward

> **postApiV1TextReferralReward**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1TextReferralRewardData`](../type-aliases/PostApiV1TextReferralRewardData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1TextReferralRewardResponses`](../type-aliases/PostApiV1TextReferralRewardResponses.md), [`PostApiV1TextReferralRewardErrors`](../type-aliases/PostApiV1TextReferralRewardErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1015](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1015)

Grant referral reward credits

Grants credits to the referrer (and optionally referee) when a referral is completed. Idempotent: duplicate referrer+referee+channel pairs return 409.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1TextReferralRewardData`](../type-aliases/PostApiV1TextReferralRewardData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1TextReferralRewardResponses`](../type-aliases/PostApiV1TextReferralRewardResponses.md), [`PostApiV1TextReferralRewardErrors`](../type-aliases/PostApiV1TextReferralRewardErrors.md), `ThrowOnError`>
