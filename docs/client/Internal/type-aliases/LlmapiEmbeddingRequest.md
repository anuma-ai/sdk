# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#350)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#355)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#359)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#363)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:367](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#367)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:371](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#371)

Model identifier in 'provider/model' format
