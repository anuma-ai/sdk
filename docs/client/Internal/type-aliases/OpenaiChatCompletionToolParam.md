# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:3682](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3682)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3683](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3683)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:3684](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3684)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3690)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
