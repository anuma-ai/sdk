# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3815)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3816](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3816)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3817](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3817)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3823](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3823)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:3827](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3827)

Tool call that this message is responding to.
