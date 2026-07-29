# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3618)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3619)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3620](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3620)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3624](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3624)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3630)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
