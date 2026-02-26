# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:693](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#693)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#697)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:701](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#701)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#705)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#709)

Model identifier in 'provider/model' format
