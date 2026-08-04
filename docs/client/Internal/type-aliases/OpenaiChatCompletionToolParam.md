# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4263](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4263)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4264)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4265](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4265)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4271](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4271)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
