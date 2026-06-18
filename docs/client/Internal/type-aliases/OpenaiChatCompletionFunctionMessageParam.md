# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3359)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3360)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3361](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3361)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3365](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3365)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3371](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3371)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
