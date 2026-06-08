# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:3898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3898)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3899)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:3900](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3900)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3906](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3906)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
