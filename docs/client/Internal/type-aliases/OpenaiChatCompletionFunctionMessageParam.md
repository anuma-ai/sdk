# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3772)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3773](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3773)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3774](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3774)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3778)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3784)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
