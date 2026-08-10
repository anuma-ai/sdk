# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4649](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4649)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4650](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4650)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4651](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4651)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4657](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4657)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
