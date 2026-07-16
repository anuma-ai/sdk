# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3523](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3523)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3524](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3524)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3525](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3525)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3526)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3532)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
