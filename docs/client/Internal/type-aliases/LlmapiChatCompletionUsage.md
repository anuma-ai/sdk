# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:414](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L414)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:418](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L418)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:422](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L422)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:426](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L426)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:430](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L430)

TotalTokens is the total number of tokens used
