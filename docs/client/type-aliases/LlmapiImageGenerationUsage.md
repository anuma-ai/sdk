---
title: LlmapiImageGenerationUsage
---

[SDK Documentation](../../README.md) / [client](../README.md) / LlmapiImageGenerationUsage

# Type Alias: LlmapiImageGenerationUsage

> **LlmapiImageGenerationUsage** = `object`

Defined in: [client/types.gen.ts:281](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L281)

Usage documents token usage (when available).

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [client/types.gen.ts:285](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L285)

CostMicroUSD is the inference cost for this image generation request

***

### input\_tokens?

> `optional` **input\_tokens**: `number`

Defined in: [client/types.gen.ts:289](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L289)

InputTokens is the number of tokens sent in the prompt.

***

### output\_tokens?

> `optional` **output\_tokens**: `number`

Defined in: [client/types.gen.ts:293](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L293)

OutputTokens is the number of tokens returned by the model.

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [client/types.gen.ts:297](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L297)

TotalTokens is the total number of tokens consumed.
