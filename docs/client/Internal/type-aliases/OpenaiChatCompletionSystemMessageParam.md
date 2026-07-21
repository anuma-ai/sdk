# OpenaiChatCompletionSystemMessageParam

> **OpenaiChatCompletionSystemMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3937)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3938](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3938)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionSystemMessageParamContentUnion`](OpenaiChatCompletionSystemMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3939](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3939)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3940)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3946](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3946)

The role of the messages author, in this case `system`.

This field can be elided, and will marshal its zero value as "system".
