# postApiV1AdminAddCredits

> **postApiV1AdminAddCredits**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminAddCreditsData`](../type-aliases/PostApiV1AdminAddCreditsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminAddCreditsResponses`](../type-aliases/PostApiV1AdminAddCreditsResponses.md), [`PostApiV1AdminAddCreditsErrors`](../type-aliases/PostApiV1AdminAddCreditsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:26](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L26)

Add credits to user

Adds credits to a user's cost limit on-chain. Requires admin API key and ADMIN\_ROLE on smart contract. Optionally specify escrow\_contract for custom escrow contracts.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminAddCreditsData`](../type-aliases/PostApiV1AdminAddCreditsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminAddCreditsResponses`](../type-aliases/PostApiV1AdminAddCreditsResponses.md), [`PostApiV1AdminAddCreditsErrors`](../type-aliases/PostApiV1AdminAddCreditsErrors.md), `ThrowOnError`>
