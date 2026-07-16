# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4248)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4249](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4249)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4250)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4256)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
