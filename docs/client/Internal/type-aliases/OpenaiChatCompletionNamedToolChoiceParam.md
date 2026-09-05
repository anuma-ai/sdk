# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:4581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4581)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4582](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4582)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:4583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4583)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4589)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
