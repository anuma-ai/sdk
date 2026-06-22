# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4103)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4104)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4105)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4111)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
