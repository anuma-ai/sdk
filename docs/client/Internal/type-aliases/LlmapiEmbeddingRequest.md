# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:365](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L365)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:369](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L369)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:373](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L373)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:377](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L377)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:381](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L381)

Model identifier in 'provider/model' format
