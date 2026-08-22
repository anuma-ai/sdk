# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4876](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4876)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4877)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4878)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4884)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
