# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:644](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L644)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:648](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L648)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:652](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L652)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:656](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L656)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:660](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L660)

Model identifier in 'provider/model' format
