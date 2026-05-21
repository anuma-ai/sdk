# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:1444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1444)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1448](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1448)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1452)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1456](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1456)

CreditsUsed is the number of credits consumed by this completion (ceiling of cost / MicroUSDPerCredit)

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1460](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1460)

InitCompletionTokens is the completion token count from the first LLM call before the MCP tool loop

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1464](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1464)

InitPromptTokens is the prompt token count from the first LLM call before the MCP tool loop

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1468)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1472)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1476)

TotalTokens is the total number of tokens used
