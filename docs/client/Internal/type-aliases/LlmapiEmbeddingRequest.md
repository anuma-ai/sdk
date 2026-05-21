# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:1948](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1948)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1953)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:1957](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1957)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:1961](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1961)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:1965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1965)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1969)

Model identifier in 'provider/model' format
