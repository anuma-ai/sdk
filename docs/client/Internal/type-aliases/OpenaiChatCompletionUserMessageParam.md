# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4592](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4592)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4593](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4593)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4594](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4594)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4595](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4595)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4601](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4601)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
