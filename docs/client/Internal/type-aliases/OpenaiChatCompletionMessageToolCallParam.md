# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:4331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4331)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4332](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4332)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:4333](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4333)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:4337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4337)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4343)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
