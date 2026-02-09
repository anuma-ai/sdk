# postApiV1CreditsPurchase

> **postApiV1CreditsPurchase**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsPurchaseData`](../type-aliases/PostApiV1CreditsPurchaseData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1CreditsPurchaseResponses`](../type-aliases/PostApiV1CreditsPurchaseResponses.md), [`PostApiV1CreditsPurchaseErrors`](../type-aliases/PostApiV1CreditsPurchaseErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:274](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L274)

Create credit pack checkout session

Creates a Stripe Checkout Session for purchasing a one-time credit pack and returns the checkout URL. Pro users receive a 10% bonus.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsPurchaseData`](../type-aliases/PostApiV1CreditsPurchaseData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1CreditsPurchaseResponses`](../type-aliases/PostApiV1CreditsPurchaseResponses.md), [`PostApiV1CreditsPurchaseErrors`](../type-aliases/PostApiV1CreditsPurchaseErrors.md), `ThrowOnError`>
