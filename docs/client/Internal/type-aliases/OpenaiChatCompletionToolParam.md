# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:3816](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3816)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3817](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3817)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:3818](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3818)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3824](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3824)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
