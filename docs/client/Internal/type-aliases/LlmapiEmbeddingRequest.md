# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:463](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#463)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#468)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#472)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#476)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:480](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#480)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#484)

Model identifier in 'provider/model' format
