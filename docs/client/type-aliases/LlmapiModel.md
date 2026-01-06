# LlmapiModel

> **LlmapiModel** = \{ `architecture?`: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md); `canonical_slug?`: `string`; `context_length?`: `number`; `created?`: `number`; `default_parameters?`: \{\[`key`: `string`\]: `unknown`; \}; `description?`: `string`; `hugging_face_id?`: `string`; `id?`: `string`; `max_input_tokens?`: `number`; `max_output_tokens?`: `number`; `modalities?`: `string`[]; `name?`: `string`; `owned_by?`: `string`; `per_request_limits?`: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md); `pricing?`: [`LlmapiModelPricing`](LlmapiModelPricing.md); `supported_methods?`: `string`[]; `supported_parameters?`: `string`[]; `top_provider?`: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md); \}

Defined in: [src/client/types.gen.ts:404](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L404)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:405](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L405)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:409](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L409)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:413](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L413)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:417](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L417)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: \{\[`key`: `string`\]: `unknown`; \}

Defined in: [src/client/types.gen.ts:421](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L421)

DefaultParameters contains default parameter values

#### Index Signature

\[`key`: `string`\]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:427](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L427)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:431](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L431)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:435](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L435)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:439](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L439)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:443](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L443)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`[]

Defined in: [src/client/types.gen.ts:447](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L447)

Modalities is a list of supported modalities (e.g., ["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:451](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L451)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:455](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L455)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:456](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L456)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:457](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L457)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`[]

Defined in: [src/client/types.gen.ts:461](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L461)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`[]

Defined in: [src/client/types.gen.ts:465](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L465)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:466](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L466)
