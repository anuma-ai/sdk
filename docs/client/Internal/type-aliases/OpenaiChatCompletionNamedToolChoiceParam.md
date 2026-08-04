# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3792)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3793](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3793)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3794](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3794)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3800)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
