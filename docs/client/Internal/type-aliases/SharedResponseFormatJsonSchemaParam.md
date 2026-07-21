# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4261](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4261)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4262)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4263](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4263)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4269](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4269)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
