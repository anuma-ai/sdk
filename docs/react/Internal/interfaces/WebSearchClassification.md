# WebSearchClassification

Defined in: [src/lib/chat/webSearchClassifier.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#22)

## Properties

### needsWebSearch

> **needsWebSearch**: `boolean`

Defined in: [src/lib/chat/webSearchClassifier.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#24)

Whether the prompt likely needs a web search.

***

### noSearchScore

> **noSearchScore**: `number`

Defined in: [src/lib/chat/webSearchClassifier.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#28)

Cosine similarity to the "no search" centroid.

***

### searchScore

> **searchScore**: `number`

Defined in: [src/lib/chat/webSearchClassifier.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#26)

Cosine similarity to the "needs search" centroid.
