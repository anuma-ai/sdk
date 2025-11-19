---
title: LlmapiEmbeddingRequest
---

[@reverbia/sdk](../globals.md) / LlmapiEmbeddingRequest

# Type Alias: LlmapiEmbeddingRequest

> **LlmapiEmbeddingRequest** = `object`

Defined in: [types.gen.ts:147](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L147)

## Properties

### dimensions?

> `optional` **dimensions**: `number`

Defined in: [types.gen.ts:151](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L151)

Dimensions is the number of dimensions the resulting output embeddings should have (optional)

***

### encoding\_format?

> `optional` **encoding\_format**: `string`

Defined in: [types.gen.ts:155](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L155)

EncodingFormat is the format to return the embeddings in (optional: "float" or "base64")

***

### input?

> `optional` **input**: `unknown`

Defined in: [types.gen.ts:159](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L159)

Input text or tokens to embed (can be string, []string, []int, or [][]int)

***

### model?

> `optional` **model**: `string`

Defined in: [types.gen.ts:163](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L163)

Model identifier in 'provider/model' format
