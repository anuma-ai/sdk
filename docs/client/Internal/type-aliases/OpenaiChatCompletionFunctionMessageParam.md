# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3626)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3627](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3627)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3628](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3628)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3632](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3632)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3638](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3638)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
