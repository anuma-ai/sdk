# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3392)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3393)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3394)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3398)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3404](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3404)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
