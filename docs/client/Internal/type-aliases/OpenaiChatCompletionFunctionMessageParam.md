# OpenaiChatCompletionFunctionMessageParam

> **OpenaiChatCompletionFunctionMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3986](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3986)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3987](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3987)

***

### content?

> `optional` **content**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3988](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3988)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3992](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3992)

The name of the function to call.

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3998](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3998)

The role of the messages author, in this case `function`.

This field can be elided, and will marshal its zero value as "function".
