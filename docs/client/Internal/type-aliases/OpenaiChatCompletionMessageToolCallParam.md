# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3543)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3544)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3545)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3549](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3549)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3555)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
