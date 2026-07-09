# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4006](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4006)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4007](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4007)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4008](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4008)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4009](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4009)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4015](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4015)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
