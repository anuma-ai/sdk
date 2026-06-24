# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3581)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3582](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3582)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3583)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3589)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
