# LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [src/client/types.gen.ts:270](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L270)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [src/client/types.gen.ts:274](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L274)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [src/client/types.gen.ts:278](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L278)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input

> **input**: `unknown`

Defined in: [src/client/types.gen.ts:282](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L282)

Input text or tokens to embed (can be string, \[]string, \[]int, or \[]\[]int)

***

### model

> **model**: `string`

Defined in: [src/client/types.gen.ts:286](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L286)

Model identifier in 'provider/model' format
