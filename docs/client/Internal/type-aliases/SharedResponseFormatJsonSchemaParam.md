# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4032](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4032)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4033](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4033)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4034](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4034)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4040](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4040)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
