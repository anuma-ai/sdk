# classifyStockPriceBatch

> **classifyStockPriceBatch**(`prompts`: `string`\[], `options`: `StockPriceClassifierOptions`): `Promise`<[`StockPriceClassification`](../interfaces/StockPriceClassification.md)\[]>

Defined in: [src/lib/chat/stockPriceClassifier.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#73)

Batch-classify multiple prompts. Embeds all prompts in one batch
call for efficiency.

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

`prompts`

</td>
<td>

`string`\[]

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

`Promise`<[`StockPriceClassification`](../interfaces/StockPriceClassification.md)\[]>
