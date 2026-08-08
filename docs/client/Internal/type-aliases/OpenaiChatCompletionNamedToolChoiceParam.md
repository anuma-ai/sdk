# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:4127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4127)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4128)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:4129](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4129)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4135)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
