# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:373](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L373)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:374](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L374)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:378](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L378)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:382](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L382)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:386](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L386)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:390](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L390)

DefaultParameters contains default parameter values

#### Index Signature

\[`key`: `string`\]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:396](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L396)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:400](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L400)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:404](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L404)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:408](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L408)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:412](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L412)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`[]

Defined in: [src/client/types.gen.ts:416](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L416)

Modalities is a list of supported modalities (e.g., ["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:420](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L420)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:424](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L424)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:425](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L425)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:426](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L426)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`[]

Defined in: [src/client/types.gen.ts:430](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L430)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`[]

Defined in: [src/client/types.gen.ts:434](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L434)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:435](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L435)
