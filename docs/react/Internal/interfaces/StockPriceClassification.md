# StockPriceClassification

Defined in: [src/lib/chat/stockPriceClassifier.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#9)

## Properties

### needsStockPrice

> **needsStockPrice**: `boolean`

Defined in: [src/lib/chat/stockPriceClassifier.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#11)

Whether the prompt likely asks for stock/ETF/FX quote data.

***

### noStockPriceScore

> **noStockPriceScore**: `number`

Defined in: [src/lib/chat/stockPriceClassifier.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#15)

Cosine similarity to the "no stock price" centroid.

***

### stockPriceScore

> **stockPriceScore**: `number`

Defined in: [src/lib/chat/stockPriceClassifier.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#13)

Cosine similarity to the "needs stock price" centroid.
