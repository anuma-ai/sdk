# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4021)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4022)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4023](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4023)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4029](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4029)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:4033](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4033)

Tool call that this message is responding to.
