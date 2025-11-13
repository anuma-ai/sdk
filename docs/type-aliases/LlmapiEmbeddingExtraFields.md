---
title: LlmapiEmbeddingExtraFields
---

[@reverbia/sdk](../globals.md) / LlmapiEmbeddingExtraFields

# Type Alias: LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [types.gen.ts:82](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L82)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [types.gen.ts:86](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L86)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [types.gen.ts:90](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L90)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [types.gen.ts:94](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L94)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [types.gen.ts:98](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L98)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [types.gen.ts:102](https://github.com/zeta-chain/ai-sdk/blob/94f4c3095834e789fd72ba4bab1edb37d9ed2757/src/client/types.gen.ts#L102)

RequestType is always "embedding"
