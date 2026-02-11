# LlmapiResponseUsage

> **LlmapiResponseUsage** = `object`

Defined in: [src/client/types.gen.ts:1076](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1076)

Usage contains token usage information

## Properties

### completion\_tokens?

> `optional` **completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1080](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1080)

CompletionTokens is the number of tokens in the completion

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:1084](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1084)

CostMicroUSD is the cost of this response in micro-dollars (USD × 1,000,000)

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1088](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1088)

CreditsUsed is the number of credits consumed by this response

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1092](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1092)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1096](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1096)

TotalTokens is the total number of tokens used
