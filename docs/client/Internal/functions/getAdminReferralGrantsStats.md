# getAdminReferralGrantsStats

> **getAdminReferralGrantsStats**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetAdminReferralGrantsStatsData`](../type-aliases/GetAdminReferralGrantsStatsData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetAdminReferralGrantsStatsResponses`](../type-aliases/GetAdminReferralGrantsStatsResponses.md), [`GetAdminReferralGrantsStatsErrors`](../type-aliases/GetAdminReferralGrantsStatsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#33)

Referral grant abuse statistics

Admin report of ZETA referral grants grouped by referrer, joined to phone verification state, plus total outstanding liability and the count of activations that produced no grant. Includes an explicit list of what the data cannot establish.

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

[`Options`](../type-aliases/Options.md)<[`GetAdminReferralGrantsStatsData`](../type-aliases/GetAdminReferralGrantsStatsData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetAdminReferralGrantsStatsResponses`](../type-aliases/GetAdminReferralGrantsStatsResponses.md), [`GetAdminReferralGrantsStatsErrors`](../type-aliases/GetAdminReferralGrantsStatsErrors.md), `ThrowOnError`>
