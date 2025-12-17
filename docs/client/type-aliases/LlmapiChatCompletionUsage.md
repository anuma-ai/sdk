# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L115)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:119](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L119)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L123)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:127](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L127)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:131](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L131)

TotalTokens is the total number of tokens used
