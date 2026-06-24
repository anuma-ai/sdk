# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3378)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3379](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3379)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3380)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3381](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3381)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3387)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
