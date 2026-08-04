# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3957](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3957)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3958)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3959)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3965)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
