# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3848](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3848)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3849)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3850](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3850)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3856](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3856)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:3860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3860)

Tool call that this message is responding to.
