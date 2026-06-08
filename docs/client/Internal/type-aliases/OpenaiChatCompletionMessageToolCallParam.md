# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3353](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3353)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3354)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3355)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3359)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3365](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3365)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
