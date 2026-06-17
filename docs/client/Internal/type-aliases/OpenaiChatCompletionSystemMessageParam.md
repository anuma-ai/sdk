# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3708](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3708)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3709)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3710](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3710)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3711)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3717)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
