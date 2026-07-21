# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3565](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3565)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3566)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3567](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3567)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3571)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3577](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3577)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
