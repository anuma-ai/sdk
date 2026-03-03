# LlmapiEmbeddingUsage

> **LlmapiEmbeddingUsage** = `object`

Defined in: [src/client/types.gen.ts:992](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#992)

Usage contains token usage information

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:996](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#996)

CostMicroUSD is the inference cost for this embedding request

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:1000](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1000)

CreditsUsed is the number of credits consumed by this embedding request

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1004)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1008](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1008)

TotalTokens is the total number of tokens used
