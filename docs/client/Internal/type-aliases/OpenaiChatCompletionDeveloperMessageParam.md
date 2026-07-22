# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3541](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3541)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3542](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3542)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3543)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3544)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3550](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3550)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
