# OpenaiChatCompletionMessageToolCallParam

> **OpenaiChatCompletionMessageToolCallParam** = `object`

Defined in: [src/client/types.gen.ts:4558](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4558)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4559)

***

### function?

> `optional` **function**: [`OpenaiChatCompletionMessageToolCallFunctionParam`](OpenaiChatCompletionMessageToolCallFunctionParam.md)

Defined in: [src/client/types.gen.ts:4560](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4560)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:4564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4564)

The ID of the tool call.

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:4570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4570)

The type of the tool. Currently, only `function` is supported.

This field can be elided, and will marshal its zero value as "function".
