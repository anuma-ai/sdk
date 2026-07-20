# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3560](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3560)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3561)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3562)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3566)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3572](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3572)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
