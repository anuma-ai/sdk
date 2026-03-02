# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#949)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#953)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:957](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#957)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:961](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#961)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#965)

Model identifier in 'provider/model' format
