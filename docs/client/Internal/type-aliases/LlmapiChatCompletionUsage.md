# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = { `completion_tokens?`: `number`; `cost_micro_usd?`: `number`; `prompt_tokens?`: `number`; `total_tokens?`: `number`; }

Defined in: [src/client/types.gen.ts:198](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L198)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:202](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L202)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:206](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L206)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:210](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L210)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:214](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L214)

TotalTokens is the total number of tokens used
