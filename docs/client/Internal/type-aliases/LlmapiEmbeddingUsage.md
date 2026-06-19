# LlmapiEmbeddingUsage

> **LlmapiEmbeddingUsage** = `object`

Defined in: [src/client/types.gen.ts:398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#398)

Usage contains token usage information

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#402)

CostMicroUSD is the inference cost for this embedding request

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:406](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#406)

CreditsUsed is the number of credits consumed by this embedding request

***

### pricing\_source?

> `optional` **pricing\_source**: `string`

Defined in: [src/client/types.gen.ts:410](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#410)

PricingSource identifies which lookup produced CostMicroUSD; see internal/pricing/source.go.

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#414)

PromptTokens is the number of tokens in the prompt

***

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#419)

ProviderCostMicroUSD is what we believe the provider charged us in micro-USD.
Today equals CostMicroUSD (no markup); kept distinct so future per-tier pricing preserves history.

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#423)

TotalTokens is the total number of tokens used
