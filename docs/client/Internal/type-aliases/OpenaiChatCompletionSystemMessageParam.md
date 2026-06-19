# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3731](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3731)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3732](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3732)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3733)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3734](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3734)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3740](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3740)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
