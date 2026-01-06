# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:759](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L759)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:763](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L763)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:767](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L767)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:771](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L771)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:775](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L775)

TotalTokens is the total number of tokens used
