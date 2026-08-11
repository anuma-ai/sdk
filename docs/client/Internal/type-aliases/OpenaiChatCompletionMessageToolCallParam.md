# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:4137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4137)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4138)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:4139](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4139)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:4143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4143)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4149)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
