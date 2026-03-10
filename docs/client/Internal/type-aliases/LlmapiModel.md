# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:1154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1154)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:1155](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1155)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:1159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1159)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:1163](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1163)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1167](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1167)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:1171](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1171)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1177](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1177)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:1181](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1181)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1185](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1185)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1189](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1189)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1193](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1193)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:1197](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1197)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1201](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1201)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:1205](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1205)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:1206](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1206)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:1207](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1207)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:1211](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1211)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:1215](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1215)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:1216](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1216)
