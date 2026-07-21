# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3716](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3716)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3717)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3718](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3718)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3722](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3722)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3728)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
