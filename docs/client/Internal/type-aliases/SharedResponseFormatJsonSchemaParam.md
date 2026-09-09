# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:5103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5103)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:5104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5104)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:5105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5105)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:5111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5111)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
