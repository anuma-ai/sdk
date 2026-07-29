# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3777](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3777)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3778)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3779](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3779)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3783](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3783)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3789](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3789)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
