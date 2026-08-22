# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4552](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4552)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4553)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4554](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4554)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4555)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4561)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
