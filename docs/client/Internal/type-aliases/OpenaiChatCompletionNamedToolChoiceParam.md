# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:4354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4354)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4355)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:4356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4356)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4362)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
