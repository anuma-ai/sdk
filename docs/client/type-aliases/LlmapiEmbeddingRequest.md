# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:232](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L232)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:236](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L236)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:240](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L240)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:244](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L244)

Input text or tokens to embed (can be string, []string, []int, or [][]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:248](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L248)

Model identifier in 'provider/model' format
