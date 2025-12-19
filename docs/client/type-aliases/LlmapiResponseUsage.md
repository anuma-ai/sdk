# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:652](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L652)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:656](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L656)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:660](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L660)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:664](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L664)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:668](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L668)

TotalTokens is the total number of tokens used
