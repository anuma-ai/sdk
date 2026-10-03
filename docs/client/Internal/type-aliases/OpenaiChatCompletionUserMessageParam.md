# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4898)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4899](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4899)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4900](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4900)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4901](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4901)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4907](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4907)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
