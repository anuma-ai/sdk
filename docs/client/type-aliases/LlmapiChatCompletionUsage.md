# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = \{ `completion_tokens?`: `number`; `cost_micro_usd?`: `number`; `prompt_tokens?`: `number`; `total_tokens?`: `number`; \}

Defined in: [src/client/types.gen.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L142)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:146](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L146)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:150](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L150)

CostMicroUSD is the cost of this completion in micro-dollars (USD × 1,000,000)

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L154)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L158)

TotalTokens is the total number of tokens used
