# getReferralMe

> **getReferralMe**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetReferralMeData`](../type-aliases/GetReferralMeData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetReferralMeResponses`](../type-aliases/GetReferralMeResponses.md), [`GetReferralMeErrors`](../type-aliases/GetReferralMeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:2004](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#2004)

Read the caller's waitlist and referral state

Served entirely from the portal's mirror; never calls Prefinery. Safe to poll — tester.updated\_at is the freshness signal.

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

[`Options`](../type-aliases/Options.md)<[`GetReferralMeData`](../type-aliases/GetReferralMeData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetReferralMeResponses`](../type-aliases/GetReferralMeResponses.md), [`GetReferralMeErrors`](../type-aliases/GetReferralMeErrors.md), `ThrowOnError`>
