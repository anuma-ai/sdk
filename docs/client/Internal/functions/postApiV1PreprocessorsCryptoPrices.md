# postApiV1PreprocessorsCryptoPrices

> **postApiV1PreprocessorsCryptoPrices**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsCryptoPricesData`](../type-aliases/PostApiV1PreprocessorsCryptoPricesData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1PreprocessorsCryptoPricesResponses`](../type-aliases/PostApiV1PreprocessorsCryptoPricesResponses.md), [`PostApiV1PreprocessorsCryptoPricesErrors`](../type-aliases/PostApiV1PreprocessorsCryptoPricesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1297](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1297)

Get crypto prices

Extracts ticker candidates (cashtags, uppercase symbols, lowercase names) from the supplied prompt, resolves them against CoinGecko, and returns USD quotes. Used by SDK pre-processors to enrich prompts with crypto market data.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1PreprocessorsCryptoPricesData`](../type-aliases/PostApiV1PreprocessorsCryptoPricesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1PreprocessorsCryptoPricesResponses`](../type-aliases/PostApiV1PreprocessorsCryptoPricesResponses.md), [`PostApiV1PreprocessorsCryptoPricesErrors`](../type-aliases/PostApiV1PreprocessorsCryptoPricesErrors.md), `ThrowOnError`>
