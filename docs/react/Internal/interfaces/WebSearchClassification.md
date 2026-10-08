# WebSearchClassification

Defined in: [src/lib/chat/webSearchClassifier.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#9)

## Properties

### needsWebSearch

> **needsWebSearch**: `boolean`

Defined in: [src/lib/chat/webSearchClassifier.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#11)

Whether the prompt likely needs a web search.

***

### noSearchScore

> **noSearchScore**: `number`

Defined in: [src/lib/chat/webSearchClassifier.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#15)

Cosine similarity to the "no search" centroid.

***

### searchScore

> **searchScore**: `number`

Defined in: [src/lib/chat/webSearchClassifier.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#13)

Cosine similarity to the "needs search" centroid.
