# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:698](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L698)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:702](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L702)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:706](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L706)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:710](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L710)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:714](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L714)

TotalTokens is the total number of tokens used
