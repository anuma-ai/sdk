# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3792)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3793](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3793)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3794](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3794)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3800)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:3804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3804)

Tool call that this message is responding to.
