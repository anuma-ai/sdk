# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3515](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3515)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3516](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3516)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3517)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3521)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3527)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
