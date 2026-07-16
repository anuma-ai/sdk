# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3726](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3726)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3727](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3727)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3728)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3734](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3734)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
