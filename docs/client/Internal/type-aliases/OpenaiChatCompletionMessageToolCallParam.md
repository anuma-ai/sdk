# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:4104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4104)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4105)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:4106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4106)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:4110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4110)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4116)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
