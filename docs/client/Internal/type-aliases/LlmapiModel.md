# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:1268](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1268)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:1269](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1269)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:1273](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1273)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:1277](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1277)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:1281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1281)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:1285](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1285)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1291)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:1295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1295)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1299](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1299)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1303)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:1307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1307)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:1311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1311)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1315)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:1319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1319)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:1320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1320)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:1321](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1321)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:1325](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1325)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:1329](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1329)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:1330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1330)
