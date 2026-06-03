# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3658)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3659](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3659)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3660)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3666](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3666)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:3670](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3670)

Tool call that this message is responding to.
