# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:521](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L521)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:525](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L525)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:529](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L529)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:533](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L533)

CreditsUsed is the number of credits consumed by this completion (ceiling of cost / MicroUSDPerCredit)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:537](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L537)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:541](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L541)

TotalTokens is the total number of tokens used
