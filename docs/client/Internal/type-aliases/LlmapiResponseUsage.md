# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1100](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1100)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1104](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1104)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1108](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1108)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1112](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1112)

CreditsUsed is the number of credits consumed by this response

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1116](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1116)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1120](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1120)

TotalTokens is the total number of tokens used
