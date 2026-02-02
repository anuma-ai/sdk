# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:957](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L957)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:961](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L961)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:965](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L965)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:969](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L969)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:973](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L973)

TotalTokens is the total number of tokens used
