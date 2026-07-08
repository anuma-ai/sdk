# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3637](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3637)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3638](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3638)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3639](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3639)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3643](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3643)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3649](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3649)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
