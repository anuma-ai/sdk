# SharedResponseFormatJsonSchemaJsonSchemaParam

> **SharedResponseFormatJsonSchemaJsonSchemaParam** = `object`

Defined in: [src/client/types.gen.ts:4250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4250)

Structured Outputs configuration options, including a JSON Schema.

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4251](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4251)

***

### description?

> `optional` **description**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4252)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:4257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4257)

The name of the response format. Must be a-z, A-Z, 0-9, or contain underscores
and dashes, with a maximum length of 64.

***

### schema?

> `optional` **schema**: `unknown`

Defined in: [src/client/types.gen.ts:4262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4262)

The schema for the response format, described as a JSON Schema object. Learn how
to build JSON schemas [here](https://json-schema.org/).

***

### strict?

> `optional` **strict**: [`ParamOptBool`](ParamOptBool.md)

Defined in: [src/client/types.gen.ts:4263](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4263)
