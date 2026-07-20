# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3711)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3712](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3712)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3713)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3717)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3723)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
