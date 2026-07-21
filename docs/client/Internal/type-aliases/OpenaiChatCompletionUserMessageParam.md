# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4056](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4056)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4057](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4057)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4058](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4058)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4059](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4059)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4065)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
