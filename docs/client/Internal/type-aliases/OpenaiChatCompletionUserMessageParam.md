# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4109](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4109)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4110)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4111)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4112)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4118](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4118)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
