# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3640](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3640)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3641](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3641)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3642](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3642)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3648)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
