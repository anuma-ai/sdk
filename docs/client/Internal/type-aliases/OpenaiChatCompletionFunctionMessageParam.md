# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4101](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4101)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4102](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4102)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4103)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:4107](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4107)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4113](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4113)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
