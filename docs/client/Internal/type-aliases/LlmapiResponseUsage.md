# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1005](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1005)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1009](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1009)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1013](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1013)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1017](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1017)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1021](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1021)

TotalTokens is the total number of tokens used
