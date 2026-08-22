# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4636](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4636)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4637](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4637)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4638](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4638)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4644](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4644)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4648)

Tool call that this message is responding to.
