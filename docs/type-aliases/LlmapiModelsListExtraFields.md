---
title: LlmapiModelsListExtraFields
---

[@reverbia/sdk](../globals.md) / LlmapiModelsListExtraFields

# Type Alias: LlmapiModelsListExtraFields

> **LlmapiModelsListExtraFields** = `object`

Defined in: [types.gen.ts:309](https://github.com/zeta-chain/ai-sdk/blob/0cd445c1866e4dd9bc9f0cdef80865dce1529476/src/client/types.gen.ts#L309)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [types.gen.ts:313](https://github.com/zeta-chain/ai-sdk/blob/0cd445c1866e4dd9bc9f0cdef80865dce1529476/src/client/types.gen.ts#L313)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [types.gen.ts:317](https://github.com/zeta-chain/ai-sdk/blob/0cd445c1866e4dd9bc9f0cdef80865dce1529476/src/client/types.gen.ts#L317)

Latency is the request latency in milliseconds

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [types.gen.ts:321](https://github.com/zeta-chain/ai-sdk/blob/0cd445c1866e4dd9bc9f0cdef80865dce1529476/src/client/types.gen.ts#L321)

RequestType is always "list_models"
