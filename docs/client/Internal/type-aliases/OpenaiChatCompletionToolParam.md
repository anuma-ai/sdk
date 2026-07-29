# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4098)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4099)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4100)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4106)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
