# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4106)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4107](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4107)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4108](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4108)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4114](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4114)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
