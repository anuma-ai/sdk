# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3922](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3922)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3923](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3923)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3924](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3924)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3930](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3930)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:3934](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3934)

Tool call that this message is responding to.
