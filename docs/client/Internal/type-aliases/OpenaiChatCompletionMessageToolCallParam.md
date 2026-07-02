# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3629](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3629)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3630)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3631](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3631)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3635](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3635)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3641](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3641)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
