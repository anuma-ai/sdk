# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:758](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L758)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:759](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L759)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:763](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L763)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:767](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L767)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:771](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L771)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:775](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L775)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:781](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L781)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:785](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L785)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:789](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L789)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:793](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L793)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:797](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L797)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:801](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L801)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:805](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L805)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:809](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L809)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:810](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L810)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:811](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L811)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:815](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L815)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:819](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L819)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:820](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L820)
