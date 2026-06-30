# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3466)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3467](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3467)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3468)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3472)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3478](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3478)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
