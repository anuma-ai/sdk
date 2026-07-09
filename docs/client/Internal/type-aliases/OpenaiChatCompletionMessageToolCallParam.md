# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:3666](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3666)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3667](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3667)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:3668](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3668)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:3672](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3672)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3678](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3678)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
