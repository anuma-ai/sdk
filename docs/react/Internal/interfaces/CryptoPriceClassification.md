# CryptoPriceClassification

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#23)

## Properties

### cryptoPriceScore

> **cryptoPriceScore**: `number`

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#27)

Cosine similarity to the "needs crypto price" centroid.

***

### needsCryptoPrice

> **needsCryptoPrice**: `boolean`

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#25)

Whether the prompt likely asks for crypto price data.

***

### noCryptoPriceScore

> **noCryptoPriceScore**: `number`

Defined in: [src/lib/chat/cryptoPriceClassifier.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/cryptoPriceClassifier.ts#29)

Cosine similarity to the "no crypto price" centroid.
