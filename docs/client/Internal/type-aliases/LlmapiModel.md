# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:509](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#509)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#510)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:514](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#514)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#518)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#522)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#526)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#532)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:536](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#536)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#540)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#544)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:548](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#548)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:552](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#552)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:556](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#556)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:560](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#560)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#561)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#562)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#566)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#570)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#571)
