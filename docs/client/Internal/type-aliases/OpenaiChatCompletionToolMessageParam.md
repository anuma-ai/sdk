# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4074](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4074)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4075](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4075)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4076)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4082](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4082)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4086)

Tool call that this message is responding to.
