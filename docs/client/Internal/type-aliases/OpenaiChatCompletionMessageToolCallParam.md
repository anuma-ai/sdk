# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3769](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3769)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3770)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3771](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3771)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3775](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3775)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3781](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3781)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
