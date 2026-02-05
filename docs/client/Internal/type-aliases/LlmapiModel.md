# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:671](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L671)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:672](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L672)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:676](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L676)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:680](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L680)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:684](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L684)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:688](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L688)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:694](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L694)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:698](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L698)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:702](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L702)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:706](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L706)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:710](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L710)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:714](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L714)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:718](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L718)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:722](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L722)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:723](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L723)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:724](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L724)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:728](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L728)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:732](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L732)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:733](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L733)
