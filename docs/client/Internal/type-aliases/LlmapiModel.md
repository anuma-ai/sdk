# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:627](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L627)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:628](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L628)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:632](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L632)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:636](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L636)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:640](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L640)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:644](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L644)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:650](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L650)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:654](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L654)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:658](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L658)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:662](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L662)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:666](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L666)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:670](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L670)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:674](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L674)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:678](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L678)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:679](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L679)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:680](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L680)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:684](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L684)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:688](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L688)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:689](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L689)
