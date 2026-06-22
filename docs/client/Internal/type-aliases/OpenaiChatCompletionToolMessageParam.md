# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3863](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3863)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3864)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3865](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3865)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3871](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3871)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:3875](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3875)

Tool call that this message is responding to.
