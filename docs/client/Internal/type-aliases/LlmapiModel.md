# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:1720](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1720)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:1721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1721)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:1725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1725)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:1729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1729)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1733)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:1737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1737)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1743)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:1747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1747)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1751](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1751)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1755](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1755)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1759](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1759)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:1763](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1763)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1767](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1767)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:1771](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1771)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:1772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1772)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:1773](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1773)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:1777](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1777)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:1781](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1781)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:1782](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1782)
