# StockPriceClassification

Defined in: [src/lib/chat/stockPriceClassifier.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#23)

## Properties

### needsStockPrice

> **needsStockPrice**: `boolean`

Defined in: [src/lib/chat/stockPriceClassifier.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#25)

Whether the prompt likely asks for stock/ETF/FX quote data.

***

### noStockPriceScore

> **noStockPriceScore**: `number`

Defined in: [src/lib/chat/stockPriceClassifier.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#29)

Cosine similarity to the "no stock price" centroid.

***

### stockPriceScore

> **stockPriceScore**: `number`

Defined in: [src/lib/chat/stockPriceClassifier.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/stockPriceClassifier.ts#27)

Cosine similarity to the "needs stock price" centroid.
