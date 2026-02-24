# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1140)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1144)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1148](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1148)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1152](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1152)

CreditsUsed is the number of credits consumed by this response

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1156](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1156)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1160](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1160)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L1164)

TotalTokens is the total number of tokens used
