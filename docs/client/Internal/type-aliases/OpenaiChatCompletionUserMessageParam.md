# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3977](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3977)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3978](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3978)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3979](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3979)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3980](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3980)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3986](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3986)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
