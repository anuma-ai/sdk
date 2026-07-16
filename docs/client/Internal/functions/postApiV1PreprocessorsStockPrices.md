# postApiV1PreprocessorsStockPrices

> **postApiV1PreprocessorsStockPrices**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsStockPricesData`](../type-aliases/PostApiV1PreprocessorsStockPricesData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1PreprocessorsStockPricesResponses`](../type-aliases/PostApiV1PreprocessorsStockPricesResponses.md), [`PostApiV1PreprocessorsStockPricesErrors`](../type-aliases/PostApiV1PreprocessorsStockPricesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1531](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1531)

Get stock prices

Extracts uppercase ticker candidates (cashtags, 2–5 letter uppercase symbols) and returns Twelve Data quotes covering stocks, ETFs, indices, FX, and commodities.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsStockPricesData`](../type-aliases/PostApiV1PreprocessorsStockPricesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1PreprocessorsStockPricesResponses`](../type-aliases/PostApiV1PreprocessorsStockPricesResponses.md), [`PostApiV1PreprocessorsStockPricesErrors`](../type-aliases/PostApiV1PreprocessorsStockPricesErrors.md), `ThrowOnError`>
