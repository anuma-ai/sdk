# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4155](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4155)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4156](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4156)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4157](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4157)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4158)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4164)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
