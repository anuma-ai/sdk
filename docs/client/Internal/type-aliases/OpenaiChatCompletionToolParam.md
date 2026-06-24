# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:3887](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3887)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3888)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:3889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3889)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3895](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3895)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
