---
title: LlmapiImageGenerationRequest
---

[SDK Documentation](../../README.md) / [client](../README.md) / LlmapiImageGenerationRequest

# Type Alias: LlmapiImageGenerationRequest

> **LlmapiImageGenerationRequest** = `object`

Defined in: [client/types.gen.ts:234](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L234)

## Properties

### model

> **model**: `string`

Defined in: [client/types.gen.ts:238](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L238)

Model is the model identifier to use for generation (e.g., "gpt-image-1").

***

### prompt

> **prompt**: `string`

Defined in: [client/types.gen.ts:242](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L242)

Prompt is the text description of the desired image.

***

### quality?

> `optional` **quality**: `string`

Defined in: [client/types.gen.ts:246](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L246)

Quality targets a quality preset (e.g., "auto", "high").

***

### response\_format?

> `optional` **response\_format**: `string`

Defined in: [client/types.gen.ts:250](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L250)

ResponseFormat controls how the generated image is returned (e.g., "url" or "b64_json").

***

### size?

> `optional` **size**: `string`

Defined in: [client/types.gen.ts:254](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L254)

Size controls the dimensions of the generated image (e.g., "1024x1024").
