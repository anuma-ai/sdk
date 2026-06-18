# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4055](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4055)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4056](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4056)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4057](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4057)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4063](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4063)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
