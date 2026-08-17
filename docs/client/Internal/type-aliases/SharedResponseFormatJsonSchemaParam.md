# SharedResponseFormatJsonSchemaParam

> **SharedResponseFormatJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4797](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4797)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4798](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4798)

***

### json\_schema?

> `optional` **json\_schema**: [`SharedResponseFormatJsonSchemaJsonSchemaParam`](SharedResponseFormatJsonSchemaJsonSchemaParam.md)

Defined in: [src/client/types.gen.ts:4799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4799)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4805](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4805)

The type of response format being defined. Always `json_schema`.

This field can be elided, and will marshal its zero value as "json\_schema".
