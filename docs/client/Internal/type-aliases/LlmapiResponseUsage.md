# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:2085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2085)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2089)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:2093](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2093)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:2097](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2097)

CreditsUsed is the number of credits consumed by this response

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2101](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2101)

InitCompletionTokens is the completion token count from the first LLM call before the MCP tool loop

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2105)

InitPromptTokens is the prompt token count from the first LLM call before the MCP tool loop

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2109](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2109)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:2113](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2113)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2117](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2117)

TotalTokens is the total number of tokens used
