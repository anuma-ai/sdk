# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4050](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4050)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4051)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4052](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4052)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4058](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4058)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
