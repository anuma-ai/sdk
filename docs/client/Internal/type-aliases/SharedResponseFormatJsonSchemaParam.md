# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4211](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4211)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4212](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4212)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4213)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4219](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4219)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
