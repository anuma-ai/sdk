# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3764](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3764)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3765](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3765)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3766)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3767](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3767)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3773](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3773)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
