# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3478](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3478)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3479](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3479)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3480](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3480)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3484)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3490](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3490)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
