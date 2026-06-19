# OpenaiChatCompletionToolParam

> **OpenaiChatCompletionToolParam** = `object`

Defined in: [src/client/types.gen.ts:3839](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3839)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3840](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3840)

***

### function?

> `optional` **function**: [`SharedFunctionDefinitionParam`](SharedFunctionDefinitionParam.md)

Defined in: [src/client/types.gen.ts:3841](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3841)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3847](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3847)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
