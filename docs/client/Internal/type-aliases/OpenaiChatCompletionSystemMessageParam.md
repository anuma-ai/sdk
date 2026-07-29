# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3998](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3998)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3999](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3999)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4000](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4000)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4001](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4001)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4007](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4007)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
