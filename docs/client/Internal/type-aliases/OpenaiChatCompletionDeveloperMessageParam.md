# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:4378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4378)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4379](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4379)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:4380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4380)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:4381](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4381)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:4387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4387)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
