# LlmapiModel

> **LlmapiModel** = `object`

Defined in: [src/client/types.gen.ts:793](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L793)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [src/client/types.gen.ts:794](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L794)

***

### canonical\_slug?

> `optional` **canonical\_slug**: `string`

Defined in: [src/client/types.gen.ts:798](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L798)

CanonicalSlug is the canonical slug for the model

***

### context\_length?

> `optional` **context\_length**: `number`

Defined in: [src/client/types.gen.ts:802](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L802)

ContextLength is the maximum context length in tokens

***

### created?

> `optional` **created**: `number`

Defined in: [src/client/types.gen.ts:806](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L806)

Created is the Unix timestamp of when the model was created

***

### default\_parameters?

> `optional` **default\_parameters**: `object`

Defined in: [src/client/types.gen.ts:810](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L810)

DefaultParameters contains default parameter values

**Index Signature**

\[`key`: `string`]: `unknown`

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:816](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L816)

Description describes the model and its capabilities

***

### hugging\_face\_id?

> `optional` **hugging\_face\_id**: `string`

Defined in: [src/client/types.gen.ts:820](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L820)

HuggingFaceID is the Hugging Face model identifier

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:824](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L824)

ID is the model identifier (e.g., "openai/gpt-4")

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:828](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L828)

MaxInputTokens is the maximum input tokens

***

### max\_output\_tokens?

> `optional` **max\_output\_tokens**: `number`

Defined in: [src/client/types.gen.ts:832](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L832)

MaxOutputTokens is the maximum output tokens

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:836](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L836)

Modalities is a list of supported modalities (e.g., \["llm", "vision"])

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:840](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L840)

Name is the human-readable model name (optional)

***

### owned\_by?

> `optional` **owned\_by**: `string`

Defined in: [src/client/types.gen.ts:844](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L844)

OwnedBy is the organization that owns the model

***

### per\_request\_limits?

> `optional` **per\_request\_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [src/client/types.gen.ts:845](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L845)

***

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [src/client/types.gen.ts:846](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L846)

***

### supported\_methods?

> `optional` **supported\_methods**: `string`\[]

Defined in: [src/client/types.gen.ts:850](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L850)

SupportedMethods is a list of supported API methods

***

### supported\_parameters?

> `optional` **supported\_parameters**: `string`\[]

Defined in: [src/client/types.gen.ts:854](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L854)

SupportedParameters is a list of supported parameter names

***

### top\_provider?

> `optional` **top\_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [src/client/types.gen.ts:855](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L855)
