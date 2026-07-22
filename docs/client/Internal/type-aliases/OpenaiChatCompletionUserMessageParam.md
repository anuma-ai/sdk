# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4061](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4061)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4062](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4062)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4063](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4063)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4064](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4064)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4070](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4070)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
