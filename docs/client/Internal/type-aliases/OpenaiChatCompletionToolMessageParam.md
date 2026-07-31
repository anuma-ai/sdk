# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4228](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4228)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4229](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4229)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4230](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4230)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4236)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4240](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4240)

Tool call that this message is responding to.
