# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:453](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L453)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:454](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L454)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:458](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L458)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:462](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L462)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:466](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L466)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:470](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L470)

DefaultParameters contains default parameter values

#### Index Signature

\[`key`: `string`\]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:476](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L476)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:480](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L480)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:484](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L484)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:488](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L488)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:492](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L492)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`[]

Defined in: [src/client/types.gen.ts:496](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L496)

Modalities is a list of supported modalities (e.g., ["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:500](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L500)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:504](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L504)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:505](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L505)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:506](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L506)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`[]

Defined in: [src/client/types.gen.ts:510](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L510)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`[]

Defined in: [src/client/types.gen.ts:514](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L514)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:515](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L515)
