# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1389](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1389)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1393)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1397](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1397)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1401](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1401)

CreditsUsed is the number of credits consumed by this response

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1405](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1405)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1409)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1413)

TotalTokens is the total number of tokens used
