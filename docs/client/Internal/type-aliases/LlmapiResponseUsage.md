# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#953)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:957](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#957)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:961](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#961)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#965)

CreditsUsed is the number of credits consumed by this response

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:969](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#969)

InitCompletionTokens is the completion token count from the first LLM call before the MCP tool loop

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#973)

InitPromptTokens is the prompt token count from the first LLM call before the MCP tool loop

***

### pricing\_source?

> `optional` **pricing\_source**: `string`

Defined in: [src/client/types.gen.ts:977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#977)

PricingSource identifies which lookup produced CostMicroUSD; see internal/pricing/source.go.

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:981](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#981)

PromptTokens is the number of tokens in the prompt

***

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:986](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#986)

ProviderCostMicroUSD is what we believe the provider charged us in micro-USD.
Today equals CostMicroUSD (no markup); kept distinct so future per-tier pricing preserves history.

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:990](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#990)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:994](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#994)

TotalTokens is the total number of tokens used
