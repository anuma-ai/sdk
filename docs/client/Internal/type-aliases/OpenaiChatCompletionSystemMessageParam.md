# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4144)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4145](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4145)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4146)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4147](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4147)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4153](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4153)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
