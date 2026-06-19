# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3566)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3567](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3567)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3568](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3568)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3574](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3574)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
