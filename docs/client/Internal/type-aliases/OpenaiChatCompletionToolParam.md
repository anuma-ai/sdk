# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4466)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4467](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4467)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4468)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4474](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4474)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
