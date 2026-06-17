# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3487](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3487)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3488)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3489)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3493)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3499](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3499)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
