# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:151](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L151)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:155](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L155)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:159](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L159)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:163](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L163)

Input text or tokens to embed (can be string, []string, []int, or [][]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L167)

Model identifier in 'provider/model' format
