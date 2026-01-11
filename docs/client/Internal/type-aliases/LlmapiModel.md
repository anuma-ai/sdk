# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:491](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L491)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:492](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L492)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:496](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L496)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:500](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L500)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:504](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L504)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:508](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L508)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:514](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L514)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:518](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L518)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:522](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L522)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:526](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L526)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:530](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L530)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:534](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L534)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:538](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L538)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:542](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L542)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:543](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L543)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:544](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L544)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:548](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L548)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:552](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L552)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:553](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L553)
