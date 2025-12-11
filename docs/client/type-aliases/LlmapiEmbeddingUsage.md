---
title: LlmapiEmbeddingUsage
---

[SDK Documentation](../../README.md) / [client](../README.md) / LlmapiEmbeddingUsage

# Type Alias: LlmapiEmbeddingUsage

> **LlmapiEmbeddingUsage** = `object`

Defined in: [client/types.gen.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L190)

Usage contains token usage information

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [client/types.gen.ts:194](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L194)

CostMicroUSD is the inference cost for this embedding request

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [client/types.gen.ts:198](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L198)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [client/types.gen.ts:202](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L202)

TotalTokens is the total number of tokens used
