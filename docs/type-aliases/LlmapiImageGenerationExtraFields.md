---
title: LlmapiImageGenerationExtraFields
---

[@reverbia/sdk](../globals.md) / LlmapiImageGenerationExtraFields

# Type Alias: LlmapiImageGenerationExtraFields

> **LlmapiImageGenerationExtraFields** = `object`

Defined in: [types.gen.ts:208](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L208)

ExtraFields contains additional metadata such as provider/model information.

## Properties

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [types.gen.ts:212](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L212)

ModelRequested is the model identifier that the client asked for.

***

### provider?

> `optional` **provider**: `string`

Defined in: [types.gen.ts:216](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L216)

Provider is the gateway that serviced this request.

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [types.gen.ts:220](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L220)

RequestType is always "image_generation".
