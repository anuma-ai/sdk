# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4358)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4359)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4360)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4361](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4361)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4367](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4367)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
