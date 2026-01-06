# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = \{ `dimensions?`: `number`; `encoding_format?`: `string`; `input`: `unknown`; `model`: `string`; \}

Defined in: [src/client/types.gen.ts:214](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L214)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:218](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L218)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:222](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L222)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:226](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L226)

Input text or tokens to embed (can be string, []string, []int, or [][]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:230](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L230)

Model identifier in 'provider/model' format
