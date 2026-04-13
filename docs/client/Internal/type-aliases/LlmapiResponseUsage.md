# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:2078](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2078)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2082](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2082)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:2086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2086)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:2090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2090)

CreditsUsed is the number of credits consumed by this response

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2094)

InitCompletionTokens is the completion token count from the first LLM call before the MCP tool loop

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2098)

InitPromptTokens is the prompt token count from the first LLM call before the MCP tool loop

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2102](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2102)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:2106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2106)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2110)

TotalTokens is the total number of tokens used
