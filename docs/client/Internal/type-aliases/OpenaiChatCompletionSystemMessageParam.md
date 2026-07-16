# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3924](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3924)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3925](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3925)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3926)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3927](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3927)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3933](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3933)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
