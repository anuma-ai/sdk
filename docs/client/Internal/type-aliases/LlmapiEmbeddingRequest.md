# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:486](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L486)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:490](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L490)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:494](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L494)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:498](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L498)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:502](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L502)

Model identifier in 'provider/model' format
