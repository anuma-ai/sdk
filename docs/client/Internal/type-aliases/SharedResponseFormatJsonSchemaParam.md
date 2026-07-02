# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4174](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4174)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4175)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4176](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4176)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4182](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4182)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
