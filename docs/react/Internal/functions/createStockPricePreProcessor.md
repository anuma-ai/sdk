# createStockPricePreProcessor

> **createStockPricePreProcessor**(`options`: [`StockPricePreProcessorOptions`](../interfaces/StockPricePreProcessorOptions.md)): [`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)

Defined in: [src/lib/chat/stockPriceClassifier.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#119)

Build a pre-processor that runs stock-price classification on the shared
embedding provided by `runToolLoop`, and — if the classifier decides the
prompt is asking for quotes — invokes the caller-supplied
`fetchStockPriceData` and injects the result into the conversation.

Domain: stocks, ETFs, indices, FX. For crypto use
`createCryptoPricePreProcessor`. The SDK does not run the lookup itself;
the caller wires up whichever provider they want (Twelve Data, Alpha
Vantage, Finnhub, etc.).

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

[`StockPricePreProcessorOptions`](../interfaces/StockPricePreProcessorOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)
