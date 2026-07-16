# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4043](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4043)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4044](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4044)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4045](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4045)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4046](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4046)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4052](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4052)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
