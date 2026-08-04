# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3990](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3990)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3991](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3991)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3992](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3992)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3993](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3993)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3999](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3999)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
