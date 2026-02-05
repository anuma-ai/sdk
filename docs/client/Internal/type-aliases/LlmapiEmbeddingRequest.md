# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:530](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L530)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:534](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L534)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:538](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L538)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:542](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L542)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:546](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L546)

Model identifier in 'provider/model' format
