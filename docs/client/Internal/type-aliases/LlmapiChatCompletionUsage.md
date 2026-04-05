# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = `object`

Defined in: [src/client/types.gen.ts:1485](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1485)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1489)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1493)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1497)

CreditsUsed is the number of credits consumed by this completion (ceiling of cost / MicroUSDPerCredit)

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1501)

InitCompletionTokens is the completion token count from the first LLM call before the MCP tool loop

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1505](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1505)

InitPromptTokens is the prompt token count from the first LLM call before the MCP tool loop

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1509](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1509)

PromptTokens is the number of tokens in the prompt

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1513](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1513)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1517)

TotalTokens is the total number of tokens used
