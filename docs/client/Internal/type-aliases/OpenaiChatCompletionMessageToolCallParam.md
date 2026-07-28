# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3747)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3748](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3748)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3749](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3749)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3753](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3753)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3759](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3759)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
