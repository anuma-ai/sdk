---
title: LlmapiEmbeddingExtraFields
---

[@reverbia/sdk](../globals.md) / LlmapiEmbeddingExtraFields

# Type Alias: LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [types.gen.ts:124](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L124)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [types.gen.ts:128](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L128)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [types.gen.ts:132](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L132)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [types.gen.ts:136](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L136)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [types.gen.ts:140](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L140)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [types.gen.ts:144](https://github.com/zeta-chain/ai-sdk/blob/f68d4ba82f7f7d4589d705a3990998e47785d2f4/src/client/types.gen.ts#L144)

RequestType is always "embedding"
