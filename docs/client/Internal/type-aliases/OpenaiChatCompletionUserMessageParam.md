# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4051)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4052](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4052)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4053](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4053)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4054](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4054)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4060](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4060)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
