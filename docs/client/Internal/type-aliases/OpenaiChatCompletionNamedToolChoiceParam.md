# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3744](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3744)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3745](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3745)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3746)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3752](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3752)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
