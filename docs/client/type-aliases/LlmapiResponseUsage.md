# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:691](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L691)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:695](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L695)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:699](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L699)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:703](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L703)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:707](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L707)

TotalTokens is the total number of tokens used
