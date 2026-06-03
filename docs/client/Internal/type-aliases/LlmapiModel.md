# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:492](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#492)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#493)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#497)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#501)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:505](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#505)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:509](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#509)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:515](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#515)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:519](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#519)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:523](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#523)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#527)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:531](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#531)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:535](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#535)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:539](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#539)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#543)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#544)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#545)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:549](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#549)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#553)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:554](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#554)
