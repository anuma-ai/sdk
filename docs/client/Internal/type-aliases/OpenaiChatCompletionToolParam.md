# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:3872](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3872)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3873)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:3874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3874)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3880](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3880)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
