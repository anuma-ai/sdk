---
title: LlmapiChatCompletionUsage
---

[@reverbia/sdk](../globals.md) / LlmapiChatCompletionUsage

# Type Alias: LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [types.gen.ts:79](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L79)

Usage contains token usage information

## Properties

### completion_tokens?

> `optional` **completion_tokens**: `number`

Defined in: [types.gen.ts:83](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L83)

CompletionTokens is the number of tokens in the completion

---

### cost_micro_usd?

> `optional` **cost_micro_usd**: `number`

Defined in: [types.gen.ts:87](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L87)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

---

### prompt_tokens?

> `optional` **prompt_tokens**: `number`

Defined in: [types.gen.ts:91](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L91)

PromptTokens is the number of tokens in the prompt

---

### total_tokens?

> `optional` **total_tokens**: `number`

Defined in: [types.gen.ts:95](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L95)

TotalTokens is the total number of tokens used
