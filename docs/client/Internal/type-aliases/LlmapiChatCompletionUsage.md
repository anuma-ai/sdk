# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:201](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L201)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:205](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L205)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:209](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L209)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:213](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L213)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:217](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L217)

TotalTokens is the total number of tokens used
