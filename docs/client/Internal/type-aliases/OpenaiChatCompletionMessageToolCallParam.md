# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3934](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3934)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3935)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3936)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3940)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3946](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3946)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
