# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:486](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#486)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:487](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#487)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:491](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#491)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:495](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#495)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:499](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#499)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:503](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#503)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:509](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#509)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:513](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#513)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#517)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#521)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:525](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#525)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#529)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#533)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#537)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#538)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#539)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#543)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:547](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#547)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:548](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#548)
