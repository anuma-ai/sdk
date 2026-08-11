# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:4160](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4160)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4161](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4161)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:4162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4162)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4168](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4168)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
