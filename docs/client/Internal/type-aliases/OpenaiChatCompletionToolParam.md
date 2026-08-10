# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4433](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4433)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4434](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4434)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4435](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4435)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4441)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
