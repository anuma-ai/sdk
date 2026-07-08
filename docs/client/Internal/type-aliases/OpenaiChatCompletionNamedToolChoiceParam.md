# OpenaiChatCompletionNamedToolChoiceParam

> **OpenaiChatCompletionNamedToolChoiceParam** = `object`

Defined in: [src/client/types.gen.ts:3660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3660)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3661](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3661)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionNamedToolChoiceFunctionParam`](OpenaiChatCompletionNamedToolChoiceFunctionParam.md)

Defined in: [src/client/types.gen.ts:3662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3662)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3668](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3668)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
