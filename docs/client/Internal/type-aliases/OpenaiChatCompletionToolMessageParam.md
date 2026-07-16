# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4008](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4008)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4009](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4009)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4010](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4010)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4016](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4016)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4020](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4020)

Tool call that this message is responding to.
