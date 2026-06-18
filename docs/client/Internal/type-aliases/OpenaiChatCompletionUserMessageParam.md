# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3850](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3850)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3851](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3851)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3852](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3852)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3853](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3853)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3859)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
