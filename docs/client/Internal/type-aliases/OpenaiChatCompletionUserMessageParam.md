# OpenaiChatCompletionUserMessageParam

> **OpenaiChatCompletionUserMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4671](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4671)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4672](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4672)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionUserMessageParamContentUnion`](OpenaiChatCompletionUserMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4673](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4673)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4674)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4680](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4680)

The role of the messages author, in this case `user`.

This field can be elided, and will marshal its zero value as "user".
