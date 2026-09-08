# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:4275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4275)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4276](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4276)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:4277](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4277)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4283)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
