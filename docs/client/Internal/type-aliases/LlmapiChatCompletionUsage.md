# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:458](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L458)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:462](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L462)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:466](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L466)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:470](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L470)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:474](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L474)

TotalTokens is the total number of tokens used
