# LlmapiEmbeddingUsage

> **LlmapiEmbeddingUsage** = `object`

Defined in: [src/client/types.gen.ts:936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#936)

Usage contains token usage information

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#940)

CostMicroUSD is the inference cost for this embedding request

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#944)

CreditsUsed is the number of credits consumed by this embedding request

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:948](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#948)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:952](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#952)

TotalTokens is the total number of tokens used
