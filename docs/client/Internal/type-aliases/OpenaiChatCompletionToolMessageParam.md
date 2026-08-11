# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4442](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4442)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4443](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4443)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4444)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4450](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4450)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4454](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4454)

Tool call that this message is responding to.
