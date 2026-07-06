# createCryptoPricePreProcessor

> **createCryptoPricePreProcessor**(`options`: [`CryptoPricePreProcessorOptions`](../interfaces/CryptoPricePreProcessorOptions.md)): [`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#119)

Build a pre-processor that runs crypto-price classification on the shared
embedding provided by `runToolLoop`, and — if the classifier decides the
prompt is asking for prices — invokes the caller-supplied
`fetchCryptoPriceData` and injects the result into the conversation.

Domain: crypto only. For stocks/ETFs/FX use `createStockPricePreProcessor`.
The SDK does not run the price lookup itself; the caller wires up
whichever provider they want (CoinGecko, DexScreener, an on-chain
oracle, etc.).

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

[`CryptoPricePreProcessorOptions`](../interfaces/CryptoPricePreProcessorOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)
