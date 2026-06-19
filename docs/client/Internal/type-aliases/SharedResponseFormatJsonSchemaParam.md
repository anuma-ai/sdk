# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4088)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4089)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4090)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4096](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4096)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
