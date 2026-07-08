# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3486](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3486)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3487](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3487)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3488)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3492](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3492)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3498](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3498)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
