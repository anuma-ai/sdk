# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4314)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4315)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4316](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4316)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4322)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
