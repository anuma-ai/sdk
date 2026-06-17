# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3336](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3336)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3337)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3338)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3342)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3348](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3348)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
