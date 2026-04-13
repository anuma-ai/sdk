# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:1566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1566)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `string`

Defined in: [src/client/types.gen.ts:1571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1571)

ConversationID groups requests belonging to the same conversation for observability.
Pass-through only — not forwarded to the LLM provider.

***

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:1575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1575)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:1579](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1579)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:1583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1583)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1587](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1587)

Model identifier in 'provider/model' format
