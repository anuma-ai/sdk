# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:893](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#893)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:897](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#897)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:901](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#901)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:905](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#905)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:909](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#909)

Model identifier in 'provider/model' format
