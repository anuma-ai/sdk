# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4407](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4407)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4408](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4408)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4409)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:4413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4413)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4419)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
