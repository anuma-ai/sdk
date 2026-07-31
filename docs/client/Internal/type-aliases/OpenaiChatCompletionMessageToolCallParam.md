# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3923](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3923)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3924](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3924)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3925](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3925)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3929](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3929)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3935)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
