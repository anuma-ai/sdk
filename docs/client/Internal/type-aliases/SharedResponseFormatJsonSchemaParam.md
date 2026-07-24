# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4286](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4286)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4287](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4287)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4288)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4294)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
