# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4087](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4087)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4088)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4089](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4089)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4090)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4096](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4096)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
