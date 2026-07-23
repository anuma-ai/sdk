# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3942](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3942)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3943](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3943)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3944)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3945)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3951](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3951)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
