# LlmapiResponseUsage

> **LlmapiResponseUsage** = { `completion_tokens?`: `number`; `cost_micro_usd?`: `number`; `prompt_tokens?`: `number`; `total_tokens?`: `number`; }

Defined in: [src/client/types.gen.ts:797](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L797)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:801](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L801)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:805](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L805)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:809](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L809)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:813](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L813)

TotalTokens is the total number of tokens used
