# postApiV1AdminAddCredits

> **postApiV1AdminAddCredits**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminAddCreditsData`](../type-aliases/PostApiV1AdminAddCreditsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminAddCreditsResponses`](../type-aliases/PostApiV1AdminAddCreditsResponses.md), [`PostApiV1AdminAddCreditsErrors`](../type-aliases/PostApiV1AdminAddCreditsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#38)

Add credits to user

Adds credits to a user's account. The settlement worker will handle on-chain enrollment when processing requests.

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
