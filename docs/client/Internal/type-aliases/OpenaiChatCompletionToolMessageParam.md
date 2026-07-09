# OpenaiChatCompletionToolMessageParam

> **OpenaiChatCompletionToolMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3971)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3972](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3972)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionToolMessageParamContentUnion`](OpenaiChatCompletionToolMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3973](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3973)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3979](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3979)

The role of the messages author, in this case `tool`.

This field can be elided, and will marshal its zero value as "tool".

***

### tool\_call\_id?

> `optional` **tool\_call\_id**: `string`

Defined in: [src/client/types.gen.ts:3983](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3983)

Tool call that this message is responding to.
