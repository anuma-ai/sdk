# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:609](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L609)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:613](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L613)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:617](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L617)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:621](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L621)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:625](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L625)

Model identifier in 'provider/model' format
