# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4263](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4263)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4264)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4265](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4265)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4266](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4266)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4272](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4272)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
