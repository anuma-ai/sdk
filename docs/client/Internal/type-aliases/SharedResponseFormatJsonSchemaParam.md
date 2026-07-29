# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4322)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4323](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4323)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4324](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4324)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4330)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
