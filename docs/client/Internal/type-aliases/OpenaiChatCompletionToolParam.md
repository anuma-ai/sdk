# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:3995](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3995)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3996](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3996)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:3997](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3997)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4003](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4003)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
