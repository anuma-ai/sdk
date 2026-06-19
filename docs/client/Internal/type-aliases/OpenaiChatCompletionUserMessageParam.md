# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3883](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3883)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3884)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3885](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3885)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3886)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3892](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3892)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
