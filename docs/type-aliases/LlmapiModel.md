---
title: LlmapiModel
---

[@reverbia/sdk](../globals.md) / LlmapiModel

# Type Alias: LlmapiModel

> **LlmapiModel** = `object`

Defined in: [types.gen.ts:337](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L337)

## Properties

### architecture?

> `optional` **architecture**: [`LlmapiModelArchitecture`](LlmapiModelArchitecture.md)

Defined in: [types.gen.ts:338](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L338)

---

### canonical_slug?

> `optional` **canonical_slug**: `string`

Defined in: [types.gen.ts:342](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L342)

CanonicalSlug is the canonical slug for the model

---

### context_length?

> `optional` **context_length**: `number`

Defined in: [types.gen.ts:346](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L346)

ContextLength is the maximum context length in tokens

---

### created?

> `optional` **created**: `number`

Defined in: [types.gen.ts:350](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L350)

Created is the Unix timestamp of when the model was created

---

### default_parameters?

> `optional` **default_parameters**: `object`

Defined in: [types.gen.ts:354](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L354)

DefaultParameters contains default parameter values

#### Index Signature

\[`key`: `string`\]: `unknown`

---

### description?

> `optional` **description**: `string`

Defined in: [types.gen.ts:360](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L360)

Description describes the model and its capabilities

---

### hugging_face_id?

> `optional` **hugging_face_id**: `string`

Defined in: [types.gen.ts:364](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L364)

HuggingFaceID is the Hugging Face model identifier

---

### id?

> `optional` **id**: `string`

Defined in: [types.gen.ts:368](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L368)

ID is the model identifier (e.g., "openai/gpt-4")

---

### max_input_tokens?

> `optional` **max_input_tokens**: `number`

Defined in: [types.gen.ts:372](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L372)

MaxInputTokens is the maximum input tokens

---

### max_output_tokens?

> `optional` **max_output_tokens**: `number`

Defined in: [types.gen.ts:376](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L376)

MaxOutputTokens is the maximum output tokens

---

### name?

> `optional` **name**: `string`

Defined in: [types.gen.ts:380](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L380)

Name is the human-readable model name (optional)

---

### owned_by?

> `optional` **owned_by**: `string`

Defined in: [types.gen.ts:384](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L384)

OwnedBy is the organization that owns the model

---

### per_request_limits?

> `optional` **per_request_limits**: [`LlmapiModelPerRequestLimits`](LlmapiModelPerRequestLimits.md)

Defined in: [types.gen.ts:385](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L385)

---

### pricing?

> `optional` **pricing**: [`LlmapiModelPricing`](LlmapiModelPricing.md)

Defined in: [types.gen.ts:386](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L386)

---

### supported_methods?

> `optional` **supported_methods**: `string`[]

Defined in: [types.gen.ts:390](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L390)

SupportedMethods is a list of supported API methods

---

### supported_parameters?

> `optional` **supported_parameters**: `string`[]

Defined in: [types.gen.ts:394](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L394)

SupportedParameters is a list of supported parameter names

---

### top_provider?

> `optional` **top_provider**: [`LlmapiModelTopProvider`](LlmapiModelTopProvider.md)

Defined in: [types.gen.ts:395](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/types.gen.ts#L395)
