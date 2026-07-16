# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3552](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3552)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3553)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3554](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3554)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3558](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3558)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3564](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3564)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
