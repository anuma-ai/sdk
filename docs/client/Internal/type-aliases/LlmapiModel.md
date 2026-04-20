# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:1686](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1686)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:1687](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1687)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:1691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1691)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:1695](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1695)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1699](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1699)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:1703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1703)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1709)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:1713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1713)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1717)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1721)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1725)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:1729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1729)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1733)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:1737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1737)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:1738](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1738)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:1739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1739)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:1743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1743)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:1747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1747)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:1748](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1748)
