# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3734](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3734)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3735](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3735)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3736](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3736)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3742](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3742)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
