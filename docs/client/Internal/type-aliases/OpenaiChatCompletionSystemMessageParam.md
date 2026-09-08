# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4473)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4474](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4474)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4475](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4475)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4476)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4482](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4482)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
