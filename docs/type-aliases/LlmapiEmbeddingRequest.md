---
title: LlmapiEmbeddingRequest
---

[@reverbia/sdk](../globals.md) / LlmapiEmbeddingRequest

# Type Alias: LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [types.gen.ts:105](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L105)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [types.gen.ts:109](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L109)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [types.gen.ts:113](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L113)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input?

> `optional` **input**: `unknown`

Defined in: [types.gen.ts:117](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L117)

Input text or tokens to embed (can be string, []string, []int, or [][]int)

***

### model?

> `optional` **model**: `string`

Defined in: [types.gen.ts:121](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L121)

Model identifier in 'provider/model' format
