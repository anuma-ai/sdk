# postApiV1CreditsClaimDaily

> **postApiV1CreditsClaimDaily**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsClaimDailyData`](../type-aliases/PostApiV1CreditsClaimDailyData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1CreditsClaimDailyResponses`](../type-aliases/PostApiV1CreditsClaimDailyResponses.md), [`PostApiV1CreditsClaimDailyErrors`](../type-aliases/PostApiV1CreditsClaimDailyErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:426](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#426)

Claim daily credits

Allows authenticated users to claim free daily credits. Limited to once per calendar day in user's timezone. Requires X-Timezone header with IANA timezone (e.g., "America/New\_York").

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsClaimDailyData`](../type-aliases/PostApiV1CreditsClaimDailyData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1CreditsClaimDailyResponses`](../type-aliases/PostApiV1CreditsClaimDailyResponses.md), [`PostApiV1CreditsClaimDailyErrors`](../type-aliases/PostApiV1CreditsClaimDailyErrors.md), `ThrowOnError`>
