# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#936)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#940)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#944)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:948](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#948)

CreditsUsed is the number of credits consumed by this response

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:952](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#952)

InitCompletionTokens is the completion token count from the first LLM call before the MCP tool loop

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:956](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#956)

InitPromptTokens is the prompt token count from the first LLM call before the MCP tool loop

***

### pricing\_source?

> `optional` **pricing\_source**: `string`

Defined in: [src/client/types.gen.ts:960](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#960)

PricingSource identifies which lookup produced CostMicroUSD; see internal/pricing/source.go.

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:964](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#964)

PromptTokens is the number of tokens in the prompt

***

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#969)

ProviderCostMicroUSD is what we believe the provider charged us in micro-USD.
Today equals CostMicroUSD (no markup); kept distinct so future per-tier pricing preserves history.

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#973)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#977)

TotalTokens is the total number of tokens used
