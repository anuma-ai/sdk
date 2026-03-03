# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:869](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#869)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#873)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#877)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:881](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#881)

CreditsUsed is the number of credits consumed by this completion (ceiling of cost / MicroUSDPerCredit)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:885](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#885)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#889)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:893](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#893)

TotalTokens is the total number of tokens used
