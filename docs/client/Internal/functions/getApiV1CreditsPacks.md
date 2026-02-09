# getApiV1CreditsPacks

> **getApiV1CreditsPacks**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1CreditsPacksData`](../type-aliases/GetApiV1CreditsPacksData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1CreditsPacksResponses`](../type-aliases/GetApiV1CreditsPacksResponses.md), [`GetApiV1CreditsPacksErrors`](../type-aliases/GetApiV1CreditsPacksErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:262](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L262)

List available credit packs

Returns available credit packs with prices fetched from Stripe. Pro users receive a 10% bonus on credits.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1CreditsPacksData`](../type-aliases/GetApiV1CreditsPacksData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1CreditsPacksResponses`](../type-aliases/GetApiV1CreditsPacksResponses.md), [`GetApiV1CreditsPacksErrors`](../type-aliases/GetApiV1CreditsPacksErrors.md), `ThrowOnError`>
