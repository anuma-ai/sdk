# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:1727](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1727)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:1728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1728)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:1732](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1732)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:1736](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1736)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1740](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1740)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:1744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1744)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1750](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1750)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:1754](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1754)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1758](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1758)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1762](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1762)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1766)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:1770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1770)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1774](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1774)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:1778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1778)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:1779](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1779)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:1780](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1780)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:1784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1784)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:1788](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1788)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:1789](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1789)
