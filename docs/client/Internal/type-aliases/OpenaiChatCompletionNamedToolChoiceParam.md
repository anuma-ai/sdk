# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3689](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3689)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3690)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3691)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3697)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
