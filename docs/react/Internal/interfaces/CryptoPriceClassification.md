# CryptoPriceClassification

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#9)

## Properties

### cryptoPriceScore

> **cryptoPriceScore**: `number`

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#13)

Cosine similarity to the "needs crypto price" centroid.

***

### needsCryptoPrice

> **needsCryptoPrice**: `boolean`

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#11)

Whether the prompt likely asks for crypto price data.

***

### noCryptoPriceScore

> **noCryptoPriceScore**: `number`

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#15)

Cosine similarity to the "no crypto price" centroid.
