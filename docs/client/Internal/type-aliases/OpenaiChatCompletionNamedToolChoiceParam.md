# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3739)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3740](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3740)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3741](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3741)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3747)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
