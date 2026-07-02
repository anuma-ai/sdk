# classifyCryptoPrice

> **classifyCryptoPrice**(`prompt`: `string`, `options`: `CryptoPriceClassifierOptions`): `Promise`<[`CryptoPriceClassification`](../interfaces/CryptoPriceClassification.md)>

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#61)

Classify whether a prompt needs crypto price data.

Embeds the prompt and compares it against the pre-computed centroid
vectors. Domain is crypto only — stocks and FX are handled by
`classifyStockPrice`. Ambiguous prompts (e.g. *"gold price"*) may fire
both crypto and stock classifiers — that's expected; the caller can
inject both sets of results.

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

`prompt`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

`CryptoPriceClassifierOptions`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`CryptoPriceClassification`](../interfaces/CryptoPriceClassification.md)>
