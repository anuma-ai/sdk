# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3721)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3722](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3722)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3723)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3727](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3727)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3733)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
