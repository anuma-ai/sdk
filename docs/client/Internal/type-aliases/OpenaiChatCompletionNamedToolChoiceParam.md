# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3533)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3534](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3534)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3535](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3535)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3541](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3541)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
