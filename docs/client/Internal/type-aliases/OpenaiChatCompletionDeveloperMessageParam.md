# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3363](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3363)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3364)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3365](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3365)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3366)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3372)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
