# LlmapiEmbeddingUsage

> **LlmapiEmbeddingUsage** = `object`

Defined in: [src/client/types.gen.ts:374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#374)

Usage contains token usage information

## Properties

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#378)

CostMicroUSD is the inference cost for this embedding request

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#382)

CreditsUsed is the number of credits consumed by this embedding request

***

### pricing\_source?

> `optional` **pricing\_source**: `string`

Defined in: [src/client/types.gen.ts:386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#386)

PricingSource identifies which lookup produced CostMicroUSD; see internal/pricing/source.go.

***

### prompt\_tokens?

> `optional` **prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:390](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#390)

PromptTokens is the number of tokens in the prompt

***

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:395](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#395)

ProviderCostMicroUSD is what we believe the provider charged us in micro-USD.
Today equals CostMicroUSD (no markup); kept distinct so future per-tier pricing preserves history.

***

### total\_tokens?

> `optional` **total\_tokens**: `number`

Defined in: [src/client/types.gen.ts:399](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#399)

TotalTokens is the total number of tokens used
