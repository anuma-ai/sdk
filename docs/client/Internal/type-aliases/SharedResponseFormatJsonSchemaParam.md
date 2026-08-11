# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4682](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4682)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4683](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4683)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4684](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4684)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4690)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
