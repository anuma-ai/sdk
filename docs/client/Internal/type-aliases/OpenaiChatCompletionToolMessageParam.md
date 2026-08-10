# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4409)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4410](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4410)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4411](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4411)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4417](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4417)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4421](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4421)

Tool call that this message is responding to.
