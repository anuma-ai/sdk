# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:2111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2111)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:2112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2112)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:2116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2116)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:2120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2120)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:2124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2124)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:2128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2128)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:2134](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2134)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:2138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2138)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2142)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2146)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:2150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2150)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:2154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2154)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:2158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2158)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:2162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2162)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:2163](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2163)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:2164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2164)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:2168](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2168)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:2172](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2172)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:2173](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2173)
