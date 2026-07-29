# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3800)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3801](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3801)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3802](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3802)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3808](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3808)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
