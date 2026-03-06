# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1547](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1547)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1551](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1551)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1555)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1559)

CreditsUsed is the number of credits consumed by this response

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1563)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1567](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1567)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1571)

TotalTokens is the total number of tokens used
