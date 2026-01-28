# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:273](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L273)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:277](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L277)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:281](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L281)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:285](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L285)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:289](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L289)

Model identifier in 'provider/model' format
