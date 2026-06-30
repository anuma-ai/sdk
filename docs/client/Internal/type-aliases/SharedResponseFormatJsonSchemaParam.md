# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4162)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4163](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4163)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4164)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4170](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4170)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
