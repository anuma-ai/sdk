# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4046](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4046)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4047](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4047)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4048](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4048)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4054](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4054)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4058](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4058)

Tool call that this message is responding to.
