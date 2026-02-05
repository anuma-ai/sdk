# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1016](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1016)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1020](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1020)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1024](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1024)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1028](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1028)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1032](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1032)

TotalTokens is the total number of tokens used
