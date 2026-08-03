# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4274](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4274)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4275)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4276](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4276)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4277](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4277)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4283)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
