# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3783](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3783)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3784)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3785](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3785)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3789](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3789)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3795](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3795)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
