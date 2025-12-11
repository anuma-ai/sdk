---
title: LlmapiChatCompletionUsage
---

[SDK Documentation](../../README.md) / [client](../README.md) / LlmapiChatCompletionUsage

# Type Alias: LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [client/types.gen.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L79)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [client/types.gen.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L83)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [client/types.gen.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L87)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [client/types.gen.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L91)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [client/types.gen.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L95)

TotalTokens is the total number of tokens used
