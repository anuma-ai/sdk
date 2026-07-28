# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3770)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3771](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3771)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3772)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3778)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
