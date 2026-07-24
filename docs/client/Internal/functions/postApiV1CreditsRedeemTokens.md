# postApiV1CreditsRedeemTokens

> **postApiV1CreditsRedeemTokens**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsRedeemTokensData`](../type-aliases/PostApiV1CreditsRedeemTokensData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1CreditsRedeemTokensResponses`](../type-aliases/PostApiV1CreditsRedeemTokensResponses.md), [`PostApiV1CreditsRedeemTokensErrors`](../type-aliases/PostApiV1CreditsRedeemTokensErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:768](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#768)

Redeem Anuma Tokens for credits

Burns the specified amount of Anuma Tokens via the portal operator (burnFor) and adds equivalent credits to the user's enrollment.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsRedeemTokensData`](../type-aliases/PostApiV1CreditsRedeemTokensData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1CreditsRedeemTokensResponses`](../type-aliases/PostApiV1CreditsRedeemTokensResponses.md), [`PostApiV1CreditsRedeemTokensErrors`](../type-aliases/PostApiV1CreditsRedeemTokensErrors.md), `ThrowOnError`>
