# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3202](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3202)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3203](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3203)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3204](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3204)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3208](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3208)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3214](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3214)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
