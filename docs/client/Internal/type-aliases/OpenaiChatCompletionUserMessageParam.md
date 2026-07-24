# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4081](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4081)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4082](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4082)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4083](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4083)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4084](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4084)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4090)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
