# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3932)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3933](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3933)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3934](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3934)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3935](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3935)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3941)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
