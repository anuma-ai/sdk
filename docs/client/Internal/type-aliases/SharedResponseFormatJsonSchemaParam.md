# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4182](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4182)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4183](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4183)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4184](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4184)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4190](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4190)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
