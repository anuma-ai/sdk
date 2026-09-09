# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1072)

Usage contains token usage information

## Properties

### cached\_tokens?

> `optional` **cached\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1077](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1077)

CachedTokens is the number of prompt tokens served from the provider's cache
(cache-hit reads), summed across the MCP tool loop. Omitted from the response when zero (no cache hit reported).

***

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1081](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1081)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1085)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_exhausted?

> `optional` **credits\_exhausted**: `boolean`

Defined in: [src/client/types.gen.ts:1093](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1093)

CreditsExhausted marks that per-step metering ended this run out of credits
(a mid-loop wrap-up OR a balance-truncated answer). Carried inside `usage` —
the same location the chat-completion carrier and the streaming terminal
usage chunk use — so clients read one signal regardless of channel or
transport. Omitted when false.

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1097](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1097)

CreditsUsed is the number of credits consumed by this response

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1101](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1101)

InitCompletionTokens is the completion token count from the first LLM call before the MCP tool loop

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1105)

InitPromptTokens is the prompt token count from the first LLM call before the MCP tool loop

***

### pricing\_source?

> `optional` **pricing\_source**: `string`

Defined in: [src/client/types.gen.ts:1109](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1109)

PricingSource identifies which lookup produced CostMicroUSD; see internal/pricing/source.go.

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1113](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1113)

PromptTokens is the number of tokens in the prompt

***

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1118](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1118)

ProviderCostMicroUSD is what we believe the provider charged us in micro-USD.
Today equals CostMicroUSD (no markup); kept distinct so future per-tier pricing preserves history.

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1122](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1122)

ToolCostMicroUSD is the cost of MCP tool calls in micro-dollars (subset of CostMicroUSD)

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1126](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1126)

TotalTokens is the total number of tokens used
