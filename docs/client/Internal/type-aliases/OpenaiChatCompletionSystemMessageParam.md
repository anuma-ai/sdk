# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3887](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3887)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3888)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3889)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3890)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3896](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3896)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
