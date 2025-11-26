---
title: LlmapiModelsListExtraFields
---

[@reverbia/sdk](../globals.md) / LlmapiModelsListExtraFields

# Type Alias: LlmapiModelsListExtraFields

> **LlmapiModelsListExtraFields** = `object`

Defined in: [types.gen.ts:317](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L317)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [types.gen.ts:321](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L321)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [types.gen.ts:325](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L325)

Latency is the request latency in milliseconds

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [types.gen.ts:329](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L329)

RequestType is always "list_models"
