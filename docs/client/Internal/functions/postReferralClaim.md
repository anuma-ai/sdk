# postReferralClaim

> **postReferralClaim**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostReferralClaimData`](../type-aliases/PostReferralClaimData.md), `ThrowOnError`>): `RequestResult`<[`PostReferralClaimResponses`](../type-aliases/PostReferralClaimResponses.md), [`PostReferralClaimErrors`](../type-aliases/PostReferralClaimErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1836](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1836)

Redeem a waitlist claim token

Binds the token's tester to the caller's account and promotes any staged referral attributions. Single-use, enforced by binding uniqueness; redeeming twice from the same account is idempotent.

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

[`Options`](../type-aliases/Options.md)<[`PostReferralClaimData`](../type-aliases/PostReferralClaimData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostReferralClaimResponses`](../type-aliases/PostReferralClaimResponses.md), [`PostReferralClaimErrors`](../type-aliases/PostReferralClaimErrors.md), `ThrowOnError`>
