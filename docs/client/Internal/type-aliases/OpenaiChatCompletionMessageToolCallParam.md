# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:4252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4252)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4253](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4253)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:4254](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4254)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:4258](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4258)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4264)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
