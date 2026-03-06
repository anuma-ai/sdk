# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:1200](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1200)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:1201](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1201)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:1205](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1205)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:1209](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1209)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1213)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:1217](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1217)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1223](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1223)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:1227](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1227)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1231](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1231)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1235](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1235)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1239](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1239)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:1243](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1243)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1247](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1247)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:1251](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1251)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:1252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1252)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:1253](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1253)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:1257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1257)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:1261](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1261)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:1262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1262)
