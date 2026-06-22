# SharedResponseFormatJsonSchemaJsonSchemaParam

> **SharedResponseFormatJsonSchemaJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4087)

Structured Outputs configuration options, including a JSON Schema.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4088)

***

### description?

> `optional` **description**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4089)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:4094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4094)

The name of the response format. Must be a-z, A-Z, 0-9, or contain underscores
and dashes, with a maximum length of 64.

***

### schema?

> `optional` **schema**: `unknown`

Defined in: [src/client/types.gen.ts:4099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4099)

The schema for the response format, described as a JSON Schema object. Learn how
to build JSON schemas [here](https://json-schema.org/).

***

### strict?

> `optional` **strict**: [`ParamOptBool`](ParamOptBool.md)

Defined in: [src/client/types.gen.ts:4100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4100)
