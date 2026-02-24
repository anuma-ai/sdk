# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L564)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:568](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L568)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:572](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L572)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:576](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L576)

CreditsUsed is the number of credits consumed by this completion (ceiling of cost / MicroUSDPerCredit)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:580](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L580)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:584](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L584)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:588](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L588)

TotalTokens is the total number of tokens used
