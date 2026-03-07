# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:1119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1119)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:1123](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1123)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:1127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1127)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:1131](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1131)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:1135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1135)

Model identifier in 'provider/model' format
