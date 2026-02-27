# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:1042](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1042)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:1043](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1043)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:1047](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1047)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:1051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1051)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1055](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1055)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:1059](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1059)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1065)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:1069](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1069)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1073](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1073)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1077](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1077)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1081](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1081)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:1085](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1085)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1089)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:1093](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1093)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:1094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1094)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:1095](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1095)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:1099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1099)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:1103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1103)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:1104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1104)
