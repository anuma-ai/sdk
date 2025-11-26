---
title: LlmapiModel
---

[@reverbia/sdk](../globals.md) / LlmapiModel

# Type Alias: LlmapiModel

> **LlmapiModel** = `object`

Defined in: [types.gen.ts:216](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L216)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [types.gen.ts:217](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L217)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [types.gen.ts:221](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L221)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [types.gen.ts:225](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L225)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [types.gen.ts:229](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L229)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [types.gen.ts:233](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L233)

DefaultParameters contains default parameter values

#### Index Signature

\[`key`: `string`\]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [types.gen.ts:239](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L239)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [types.gen.ts:243](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L243)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [types.gen.ts:247](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L247)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [types.gen.ts:251](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L251)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [types.gen.ts:255](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L255)

MaxOutputTokens is the maximum output tokens

***

### name?

> `optional` **name**: `string`

Defined in: [types.gen.ts:259](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L259)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [types.gen.ts:263](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L263)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [types.gen.ts:264](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L264)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [types.gen.ts:265](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L265)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`[]

Defined in: [types.gen.ts:269](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L269)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`[]

Defined in: [types.gen.ts:273](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L273)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [types.gen.ts:274](https://github.com/zeta-chain/ai-sdk/blob/05780f567dfab50e6a5aa7aba268da647ad1a083/src/client/types.gen.ts#L274)
