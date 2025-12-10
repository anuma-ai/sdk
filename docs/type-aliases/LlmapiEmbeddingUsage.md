---
title: LlmapiEmbeddingUsage
---

[@reverbia/sdk](../globals.md) / LlmapiEmbeddingUsage

# Type Alias: LlmapiEmbeddingUsage

> **LlmapiEmbeddingUsage** = `object`

Defined in: [types.gen.ts:190](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L190)

Usage contains token usage information

## Properties

### cost_micro_usd?

> `optional` **cost_micro_usd**: `number`

Defined in: [types.gen.ts:194](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L194)

CostMicroUSD is the inference cost for this embedding request

---

### prompt_tokens?

> `optional` **prompt_tokens**: `number`

Defined in: [types.gen.ts:198](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L198)

PromptTokens is the number of tokens in the prompt

---

### total_tokens?

> `optional` **total_tokens**: `number`

Defined in: [types.gen.ts:202](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L202)

TotalTokens is the total number of tokens used
