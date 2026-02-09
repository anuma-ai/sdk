# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:734](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L734)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:735](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L735)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:739](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L739)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:743](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L743)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:747](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L747)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:751](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L751)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:757](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L757)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:761](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L761)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:765](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L765)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:769](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L769)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:773](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L773)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:777](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L777)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:781](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L781)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:785](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L785)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:786](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L786)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:787](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L787)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:791](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L791)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:795](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L795)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:796](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L796)
