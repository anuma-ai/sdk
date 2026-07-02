# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3449)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3450](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3450)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3451](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3451)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3452)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3458](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3458)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
