# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:832](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L832)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:836](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L836)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:840](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L840)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:844](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L844)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:848](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L848)

TotalTokens is the total number of tokens used
