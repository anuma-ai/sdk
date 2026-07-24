# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3590](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3590)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3591](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3591)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3592](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3592)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3596](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3596)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3602](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3602)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
