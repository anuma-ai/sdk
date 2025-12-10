---
title: LlmapiModelsListExtraFields
---

[@reverbia/sdk](../globals.md) / LlmapiModelsListExtraFields

# Type Alias: LlmapiModelsListExtraFields

> **LlmapiModelsListExtraFields** = `object`

Defined in: [types.gen.ts:438](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L438)

ExtraFields contains additional metadata

## Properties

### chunk_index?

> `optional` **chunk_index**: `number`

Defined in: [types.gen.ts:442](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L442)

ChunkIndex is the chunk index (0 for single requests)

---

### latency?

> `optional` **latency**: `number`

Defined in: [types.gen.ts:446](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L446)

Latency is the request latency in milliseconds

---

### request_type?

> `optional` **request_type**: `string`

Defined in: [types.gen.ts:450](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L450)

RequestType is always "list_models"
