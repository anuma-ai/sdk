# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3597](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3597)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3598](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3598)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3599)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3600](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3600)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3606](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3606)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
