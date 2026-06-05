# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3376](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3376)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3377](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3377)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3378)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3384)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
