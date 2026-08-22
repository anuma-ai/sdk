# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:4660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4660)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4661](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4661)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:4662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4662)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4668](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4668)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
