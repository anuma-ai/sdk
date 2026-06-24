# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3779](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3779)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3780](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3780)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3781](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3781)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3782](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3782)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3788](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3788)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
