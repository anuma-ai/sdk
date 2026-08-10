# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3953)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3954](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3954)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3955](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3955)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3959)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3965](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3965)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
