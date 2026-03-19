# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:1157](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1157)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:1161](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1161)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:1165](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1165)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:1169](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1169)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1173](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1173)

Model identifier in 'provider/model' format
