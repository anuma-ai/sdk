# classifyStockPrice

> **classifyStockPrice**(`prompt`: `string`, `options`: `StockPriceClassifierOptions`): `Promise`<[`StockPriceClassification`](../interfaces/StockPriceClassification.md)>

Defined in: [src/lib/chat/stockPriceClassifier.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#60)

Classify whether a prompt needs stock/ETF/index/FX price data.

Domain: traditional financial instruments (equities, indices, ETFs, FX).
Crypto is handled by `classifyCryptoPrice`. Ambiguous prompts
(e.g. *"gold price"*) may fire both — that's expected; the caller can
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

`StockPriceClassifierOptions`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StockPriceClassification`](../interfaces/StockPriceClassification.md)>
