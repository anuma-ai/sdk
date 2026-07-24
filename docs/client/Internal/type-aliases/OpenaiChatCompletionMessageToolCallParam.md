# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3741](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3741)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3742](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3742)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3743)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3747)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3753](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3753)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
