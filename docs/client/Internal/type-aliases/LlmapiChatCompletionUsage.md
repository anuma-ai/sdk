# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:813](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#813)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:817](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#817)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#821)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:825](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#825)

CreditsUsed is the number of credits consumed by this completion (ceiling of cost / MicroUSDPerCredit)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#829)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:833](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#833)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:837](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#837)

TotalTokens is the total number of tokens used
