# LlmapiEmbeddingUsage

> **LlmapiEmbeddingUsage** = `object`

Defined in: [src/client/types.gen.ts:636](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L636)

Usage contains token usage information

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:640](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L640)

CostMicroUSD is the inference cost for this embedding request

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:644](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L644)

CreditsUsed is the number of credits consumed by this embedding request

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:648](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L648)

PromptTokens is the number of tokens in the prompt

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:652](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L652)

TotalTokens is the total number of tokens used
