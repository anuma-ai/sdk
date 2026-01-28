# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:293](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L293)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:297](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L297)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:301](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L301)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:305](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L305)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:309](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L309)

TotalTokens is the total number of tokens used
