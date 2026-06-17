# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3510)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3511](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3511)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3512](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3512)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3518)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
