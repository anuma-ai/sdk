# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3693](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3693)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3694](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3694)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3695](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3695)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3696](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3696)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3702)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
