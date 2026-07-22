# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4026)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4027)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4028](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4028)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4034](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4034)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4038](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4038)

Tool call that this message is responding to.
