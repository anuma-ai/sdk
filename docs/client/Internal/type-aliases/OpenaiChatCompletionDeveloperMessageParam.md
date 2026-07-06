# OpenaiChatCompletionDeveloperMessageParam

> **OpenaiChatCompletionDeveloperMessageParam** = `object`

Defined in: [src/client/types.gen.ts:3437](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3437)

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3438](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3438)

***

### content?

> `optional` **content**: [`OpenaiChatCompletionDeveloperMessageParamContentUnion`](OpenaiChatCompletionDeveloperMessageParamContentUnion.md)

Defined in: [src/client/types.gen.ts:3439](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3439)

***

### name?

> `optional` **name**: [`ParamOptString`](ParamOptString.md)

Defined in: [src/client/types.gen.ts:3440](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3440)

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:3446](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3446)

The role of the messages author, in this case `developer`.

This field can be elided, and will marshal its zero value as "developer".
