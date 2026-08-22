# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4180](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4180)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4181](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4181)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4182](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4182)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:4186](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4186)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4192](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4192)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
