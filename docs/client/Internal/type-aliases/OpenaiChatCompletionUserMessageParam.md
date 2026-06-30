# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3957](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3957)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3958)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3959](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3959)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3960](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3960)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3966](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3966)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
