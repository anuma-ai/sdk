# OpenaiChatCompletionNewParamsResponseFormatUnion

> **OpenaiChatCompletionNewParamsResponseFormatUnion** = `object`

Defined in: [src/client/types.gen.ts:3782](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3782)

An object specifying the format that the model must output.

Setting to `{ "type": "json_schema", "json_schema": {...} }` enables Structured
Outputs which ensures the model will match your supplied JSON schema. Learn more
in the
[Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).

Setting to `{ "type": "json_object" }` enables the older JSON mode, which
ensures the message the model generates is valid JSON. Using `json_schema` is
preferred for models that support it.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3783](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3783)

***

### ofJSONObject?

> `optional` **ofJSONObject**: [`SharedResponseFormatJsonObjectParam`](SharedResponseFormatJsonObjectParam.md)

Defined in: [src/client/types.gen.ts:3784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3784)

***

### ofJSONSchema?

> `optional` **ofJSONSchema**: [`SharedResponseFormatJsonSchemaParam`](SharedResponseFormatJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:3785](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3785)

***

### ofText?

> `optional` **ofText**: [`SharedResponseFormatTextParam`](SharedResponseFormatTextParam.md)

Defined in: [src/client/types.gen.ts:3786](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3786)
