# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4070](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4070)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4071](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4071)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4072)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4078](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4078)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
