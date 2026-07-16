# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3703)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3704](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3704)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3705)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3709)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3715)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
