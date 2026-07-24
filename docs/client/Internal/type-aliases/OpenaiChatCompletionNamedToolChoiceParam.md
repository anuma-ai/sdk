# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3764](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3764)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3765](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3765)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3766)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3772)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
