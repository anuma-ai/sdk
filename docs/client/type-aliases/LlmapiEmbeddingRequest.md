# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:187](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L187)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:191](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L191)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L195)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:199](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L199)

Input text or tokens to embed (can be string, []string, []int, or [][]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:203](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L203)

Model identifier in 'provider/model' format
