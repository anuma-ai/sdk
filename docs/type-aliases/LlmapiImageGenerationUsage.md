---
title: LlmapiImageGenerationUsage
---

[@reverbia/sdk](../globals.md) / LlmapiImageGenerationUsage

# Type Alias: LlmapiImageGenerationUsage

> **LlmapiImageGenerationUsage** = `object`

Defined in: [types.gen.ts:281](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L281)

Usage documents token usage (when available).

## Properties

### cost_micro_usd?

> `optional` **cost_micro_usd**: `number`

Defined in: [types.gen.ts:285](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L285)

CostMicroUSD is the inference cost for this image generation request

---

### input_tokens?

> `optional` **input_tokens**: `number`

Defined in: [types.gen.ts:289](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L289)

InputTokens is the number of tokens sent in the prompt.

---

### output_tokens?

> `optional` **output_tokens**: `number`

Defined in: [types.gen.ts:293](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L293)

OutputTokens is the number of tokens returned by the model.

---

### total_tokens?

> `optional` **total_tokens**: `number`

Defined in: [types.gen.ts:297](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L297)

TotalTokens is the total number of tokens consumed.
