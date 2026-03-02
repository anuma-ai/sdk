# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:842](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#842)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:843](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#843)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:847](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#847)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:851](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#851)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#855)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#859)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:865](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#865)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:869](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#869)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#873)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#877)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:881](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#881)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:885](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#885)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#889)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:893](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#893)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:894](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#894)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:895](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#895)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#899)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:903](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#903)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:904](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#904)
