# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:506](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L506)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:507](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L507)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:511](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L511)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:515](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L515)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:519](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L519)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:523](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L523)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:529](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L529)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:533](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L533)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:537](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L537)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:541](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L541)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:545](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L545)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:549](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L549)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:553](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L553)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:557](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L557)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:558](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L558)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:559](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L559)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:563](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L563)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:567](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L567)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:568](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L568)
