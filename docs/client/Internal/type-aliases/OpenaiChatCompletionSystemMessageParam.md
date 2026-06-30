# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3838](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3838)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3839](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3839)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3840](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3840)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3841](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3841)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3847](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3847)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
