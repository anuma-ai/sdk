# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3617](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3617)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3618)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3619)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3623](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3623)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3629](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3629)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
