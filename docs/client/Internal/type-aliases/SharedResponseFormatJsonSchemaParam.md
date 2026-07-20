# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4256)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4257)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4258](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4258)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4264)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
