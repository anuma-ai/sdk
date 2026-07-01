# StockPricePreProcessorOptions

Defined in: [src/lib/chat/stockPriceClassifier.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#82)

## Properties

### fetchStockPriceData()?

> `optional` **fetchStockPriceData**: (`prompt`: `string`, `options`: `object`) => `Promise`<`string` | [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]>

Defined in: [src/lib/chat/stockPriceClassifier.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#94)

Called with the caller's stock-quote provider when the classifier
decides the prompt is asking for stock/ETF/FX data. Return either a
plain string (wrapped by the SDK in a default user message) or a
fully-formed `LlmapiMessage[]` (full control over role/shape). Omit
to run in observer mode — classification still fires but nothing is
injected.

The `signal` argument is forwarded from the tool loop so long-running
provider requests can be aborted when the caller aborts.

**Parameters**

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

`object`

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]>

***

### margin?

> `optional` **margin**: `number`

Defined in: [src/lib/chat/stockPriceClassifier.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#103)

Score margin: `stockPriceScore` must exceed `noStockPriceScore` by at
least this amount to classify as "needs stock price data".

**Default**

```ts
0.02
```

***

### onClassification()?

> `optional` **onClassification**: (`result`: [`StockPriceClassification`](StockPriceClassification.md)) => `void`

Defined in: [src/lib/chat/stockPriceClassifier.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#105)

Observe the classification without injecting anything.

**Parameters**

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

`result`

</td>
<td>

[`StockPriceClassification`](StockPriceClassification.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
