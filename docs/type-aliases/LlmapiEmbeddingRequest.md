---
title: LlmapiEmbeddingRequest
---

[@reverbia/sdk](../globals.md) / LlmapiEmbeddingRequest

# Type Alias: LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [types.gen.ts:151](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L151)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [types.gen.ts:155](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L155)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [types.gen.ts:159](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L159)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input?

> `optional` **input**: `unknown`

Defined in: [types.gen.ts:163](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L163)

Input text or tokens to embed (can be string, []string, []int, or [][]int)

***

### model?

> `optional` **model**: `string`

Defined in: [types.gen.ts:167](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/types.gen.ts#L167)

Model identifier in 'provider/model' format
